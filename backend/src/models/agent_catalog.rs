use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct AgentCatalog {
    pub version: String,
    pub merchant_id: Uuid,
    pub currency: String,
    pub products: Vec<AgentProduct>,
    pub capabilities: AgentCapabilities,
}

#[derive(Debug, Serialize)]
pub struct AgentProduct {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub price: i64,
    pub currency: String,
    pub stock: i32,
    pub rating: Option<f64>,
    pub reviews: i64,
    pub available: bool,
}

#[derive(Debug, Serialize)]
pub struct AgentCapabilities {
    pub search: bool,
    pub recommendations: bool,
    pub cross_sell: bool,
    pub checkout: bool,
    pub signed_intents: bool,
    pub customer_confirmation: bool,
}
