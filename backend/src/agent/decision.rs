use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerIntent {
    pub category: Option<String>,
    pub max_price: Option<i64>,
    pub keywords: Vec<String>,
    pub wants_recommendation: bool,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRecommendation {
    pub product_id: Uuid,
    pub product_name: String,
    pub price: i64,
    pub score: f64,
    pub reasons: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossSellRecommendation {
    pub source_product_id: Uuid,
    pub product_id: Uuid,
    pub product_name: String,
    pub price: i64,
    pub confidence: f64,
    pub support_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResult {
    pub message: String,
    pub intent: CustomerIntent,
    pub recommendations: Vec<AgentRecommendation>,
    pub cross_sell: Option<CrossSellRecommendation>,
}
