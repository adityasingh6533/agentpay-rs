use reqwest::Client;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    agent::{
        decision::{AgentRecommendation, AgentResult, CustomerIntent},
        tools::catalog,
    },
    config::Config,
    errors::AppError,
};

#[derive(Clone)]
pub struct AgentOrchestrator {
    client: Client,
    config: Arc<Config>,
    db: PgPool,
}

impl AgentOrchestrator {
    pub fn new(config: Arc<Config>, db: PgPool) -> Self {
        Self {
            client: Client::new(),
            config,
            db,
        }
    }

    pub async fn process(&self, session_id: Uuid, message: &str) -> Result<AgentResult, AppError> {
        if message.trim().is_empty() {
            return Err(AppError::Validation("message cannot be empty".into()));
        }

        let intent = normalize_intent(self.extract_intent(message).await?, message);

        let products =
            catalog::search(&self.db, intent.category.as_deref(), intent.max_price).await?;

        let ranked = catalog::rank_products(
            products,
            intent.category.as_deref(),
            intent.max_price,
            &intent.keywords,
        );

        let recommendations = ranked
            .iter()
            .take(3)
            .map(|candidate| AgentRecommendation {
                product_id: candidate.product.id,
                product_name: candidate.product.name.clone(),
                price: candidate.product.price,
                score: candidate.score,
                reasons: candidate.reasons.clone(),
            })
            .collect::<Vec<_>>();
        let cross_sell = if let Some(best) = ranked.first() {
            crate::agent::tools::growth::find_cross_sell(&self.db, best.product.id)
                .await?
                .map(
                    |opportunity| crate::agent::decision::CrossSellRecommendation {
                        source_product_id: opportunity.source_product,

                        product_id: opportunity.recommended_product.id,

                        product_name: opportunity.recommended_product.name.clone(),

                        price: opportunity.recommended_product.price,

                        confidence: opportunity.confidence,

                        support_count: opportunity.support_count,
                    },
                )
        } else {
            None
        };

        let recommendation_json = serde_json::json!({
            "recommendations": recommendations,
            "cross_sell": cross_sell,
        });

        let decision_id =
    crate::db::queries::create_agent_decision(
        &self.db,
        session_id,
        None,
        "PERSONALIZED_RECOMMENDATION",
        "Selected products based on customer intent, catalog relevance, price, availability and growth affinity.",
        intent.confidence,
        recommendation_json,
        None,
        true,
    )
    .await?;

        if recommendations.is_empty() {
            crate::db::queries::create_audit_event(
                &self.db,
                session_id,
                "AGENT_RECOMMENDATION_SKIPPED",
                "AGENT",
                "REVIEW",
                "No catalog item matched the customer request, so checkout stayed locked.",
                serde_json::json!({
                    "decision_id": decision_id,
                    "confidence": intent.confidence,
                    "requested_category": intent.category.clone(),
                    "requested_keywords": intent.keywords.clone(),
                    "reason": "OUT_OF_CATALOG",
                }),
            )
            .await?;
        } else {
            crate::db::queries::create_audit_event(
                &self.db,
                session_id,
                "AGENT_DECISION_CREATED",
                "AGENT",
                "SUCCESS",
                "Agent generated a personalized product recommendation.",
                serde_json::json!({
                    "decision_id": decision_id,
                    "confidence": intent.confidence,
                    "has_cross_sell": cross_sell.is_some(),
                }),
            )
            .await?;
        }
        let response = if recommendations.is_empty() {
            "This merchant catalog does not sell a matching product, so I will not authorize checkout.".to_string()
        } else {
            format!(
                "I found {} products that match your request.",
                recommendations.len()
            )
        };

        Ok(AgentResult {
            message: response,
            intent,
            recommendations,
            cross_sell,
        })
    }

    async fn extract_intent(&self, message: &str) -> Result<CustomerIntent, AppError> {
        if self.uses_placeholder_ai_config() {
            return Ok(extract_demo_intent(message));
        }

        let system_prompt = r#"
You are the intent extraction component of a commerce agent.

Extract only structured shopping intent.

Return JSON only:

{
  "category": string | null,
  "max_price": integer | null,
  "keywords": string[],
  "wants_recommendation": boolean,
  "confidence": number
}

Never invent a budget.
Never invent a category.
If a value is not present, return null.
Confidence must be between 0 and 1.
"#;

        let request = ChatRequest {
            model: self.config.ai_model.clone(),
            messages: vec![
                ChatMessage {
                    role: "system".into(),
                    content: system_prompt.into(),
                },
                ChatMessage {
                    role: "user".into(),
                    content: message.to_string(),
                },
            ],
        };

        let response = match self
            .client
            .post(format!(
                "{}/chat/completions",
                self.config.ai_base_url.trim_end_matches('/')
            ))
            .bearer_auth(&self.config.ai_api_key)
            .json(&request)
            .send()
            .await
        {
            Ok(response) => response,

            Err(error) => {
                tracing::warn!(
                    ?error,
                    "AI provider request failed; falling back to deterministic demo intent"
                );

                return Ok(extract_demo_intent(message));
            }
        };

        if !response.status().is_success() {
            tracing::warn!(
                status = %response.status(),
                "AI provider returned an error; falling back to deterministic demo intent"
            );

            return Ok(extract_demo_intent(message));
        }

        let body: ChatResponse = match response.json().await {
            Ok(body) => body,

            Err(error) => {
                tracing::warn!(
                    ?error,
                    "Invalid AI provider response; falling back to deterministic demo intent"
                );

                return Ok(extract_demo_intent(message));
            }
        };

        let Some(choice) = body.choices.first() else {
            tracing::warn!(
                "AI provider returned no choices; falling back to deterministic demo intent"
            );

            return Ok(extract_demo_intent(message));
        };

        let content = choice.message.content.trim();

        serde_json::from_str::<CustomerIntent>(content).or_else(|error| {
            tracing::warn!(
                ?error,
                "AI returned invalid intent JSON; falling back to deterministic demo intent"
            );

            Ok(extract_demo_intent(message))
        })
    }

    fn uses_placeholder_ai_config(&self) -> bool {
        self.config.ai_api_key.trim().is_empty()
            || self.config.ai_api_key == "your_api_key"
            || self.config.ai_base_url.trim().is_empty()
            || self.config.ai_base_url == "your_provider_base_url"
            || self.config.ai_model.trim().is_empty()
            || self.config.ai_model == "your_model"
    }
}

fn extract_demo_intent(message: &str) -> CustomerIntent {
    let lower = message.to_lowercase();
    let category = if lower.contains("running") {
        Some("Running".to_string())
    } else if lower.contains("sportswear") || lower.contains("jacket") || lower.contains("shorts") {
        Some("Sportswear".to_string())
    } else if lower.contains("accessories") || lower.contains("socks") {
        Some("Accessories".to_string())
    } else {
        None
    };

    let max_price = lower
        .split(|character: char| !character.is_ascii_digit())
        .filter(|part| !part.is_empty())
        .filter_map(|part| part.parse::<i64>().ok())
        .max();

    let keywords = extract_keywords(&lower);

    CustomerIntent {
        category,
        max_price,
        keywords,
        wants_recommendation: true,
        confidence: 0.75,
    }
}

fn normalize_intent(mut intent: CustomerIntent, message: &str) -> CustomerIntent {
    let combined = format!(
        "{} {} {}",
        message,
        intent.category.as_deref().unwrap_or_default(),
        intent.keywords.join(" ")
    )
    .to_lowercase();

    intent.category = if combined.contains("sock") || combined.contains("accessor") {
        Some("Accessories".to_string())
    } else if combined.contains("jacket")
        || combined.contains("short")
        || combined.contains("tee")
        || combined.contains("t-shirt")
        || combined.contains("sportswear")
        || combined.contains("apparel")
    {
        Some("Sportswear".to_string())
    } else if combined.contains("shoe")
        || combined.contains("sneaker")
        || combined.contains("runner")
        || combined.contains("running")
    {
        Some("Running".to_string())
    } else {
        None
    };

    let normalized_keywords =
        extract_keywords(&format!("{} {}", message, intent.keywords.join(" ")));

    if !normalized_keywords.is_empty() {
        intent.keywords = normalized_keywords;
    }

    if !intent.wants_recommendation {
        intent.wants_recommendation = combined.contains("need")
            || combined.contains("want")
            || combined.contains("buy")
            || combined.contains("recommend")
            || intent.category.is_some();
    }

    intent
}

fn extract_keywords(value: &str) -> Vec<String> {
    value
        .to_lowercase()
        .split(|character: char| !character.is_ascii_alphanumeric())
        .filter(|part| part.len() > 2)
        .filter(|part| !part.chars().all(|character| character.is_ascii_digit()))
        .filter(|part| !is_stop_word(part))
        .map(ToString::to_string)
        .collect()
}

fn is_stop_word(keyword: &str) -> bool {
    matches!(
        keyword,
        "need"
            | "want"
            | "show"
            | "find"
            | "recommend"
            | "buy"
            | "under"
            | "below"
            | "less"
            | "than"
            | "best"
            | "good"
            | "for"
            | "with"
            | "and"
            | "the"
            | "that"
            | "this"
            | "please"
            | "looking"
    )
}

#[derive(Debug, Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}
