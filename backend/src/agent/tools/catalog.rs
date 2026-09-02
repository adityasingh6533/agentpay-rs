use sqlx::PgPool;

use crate::{db::queries, errors::AppError, models::Product};

#[derive(Debug, Clone)]
pub struct CatalogCandidate {
    pub product: Product,
    pub score: f64,
    pub relevance_score: f64,
    pub reasons: Vec<String>,
}

pub async fn search(
    pool: &PgPool,
    category: Option<&str>,
    max_price: Option<i64>,
) -> Result<Vec<Product>, AppError> {
    if let Some(price) = max_price {
        if price <= 0 {
            return Err(AppError::Validation("max price must be positive".into()));
        }
    }

    Ok(queries::search_products(pool, category, max_price, 20).await?)
}

pub fn rank_products(
    products: Vec<Product>,
    category: Option<&str>,
    max_price: Option<i64>,
    keywords: &[String],
) -> Vec<CatalogCandidate> {
    let keywords = normalize_keywords(keywords);

    let mut candidates = products
        .into_iter()
        .map(|product| {
            let mut score = 0.0;
            let mut relevance_score = 0.0;
            let mut reasons = Vec::new();
            let searchable = format!(
                "{} {} {} {}",
                product.name, product.description, product.category, product.metadata
            )
            .to_lowercase();

            // Category relevance
            if let Some(category) = category {
                let category = category.to_lowercase();

                if product.category.to_lowercase() == category {
                    score += 35.0;

                    reasons.push("category matches customer intent".to_string());
                    relevance_score += 35.0;
                } else if searchable.contains(&category) {
                    score += 22.0;
                    relevance_score += 22.0;

                    reasons.push("product text matches customer intent".to_string());
                }
            }

            let keyword_hits = keywords
                .iter()
                .filter(|keyword| searchable.contains(keyword.as_str()))
                .count();

            if keyword_hits > 0 {
                let keyword_score = (keyword_hits as f64 * 8.0).min(24.0);
                score += keyword_score;
                relevance_score += keyword_score;

                reasons.push("matches customer keywords".to_string());
            }

            // Budget fit
            if let Some(max_price) = max_price {
                if product.price <= max_price {
                    let remaining = max_price - product.price;

                    let budget_score = if max_price == 0 {
                        0.0
                    } else {
                        20.0 * (1.0 - remaining as f64 / max_price as f64)
                    };

                    score += budget_score;

                    reasons.push("fits requested budget".to_string());
                }
            }

            // Rating
            if let Some(rating) = product.rating {
                score += (rating / 5.0) * 20.0;

                if rating >= 4.5 {
                    reasons.push("high customer rating".to_string());
                }
            }

            // Review confidence
            let review_score = ((product.review_count as f64).ln_1p() / 10.0).min(1.0) * 10.0;

            score += review_score;

            // Availability
            if product.stock > 0 {
                score += 15.0;

                reasons.push("currently in stock".to_string());
            }

            CatalogCandidate {
                product,
                score,
                relevance_score,
                reasons,
            }
        })
        .filter(|candidate| candidate.relevance_score > 0.0)
        .collect::<Vec<_>>();

    candidates.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    candidates
}

fn normalize_keywords(keywords: &[String]) -> Vec<String> {
    keywords
        .iter()
        .flat_map(|keyword| {
            keyword
                .split(|character: char| !character.is_ascii_alphanumeric())
                .map(str::to_string)
                .collect::<Vec<_>>()
        })
        .map(|keyword| keyword.to_lowercase())
        .filter(|keyword| keyword.len() > 2)
        .filter(|keyword| !keyword.chars().all(|character| character.is_ascii_digit()))
        .filter(|keyword| !is_stop_word(keyword))
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
