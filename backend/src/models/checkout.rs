use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutRequest {
    pub session_id: Uuid,
    pub customer_id: Uuid,
    pub merchant_id: Uuid,
    pub product_ids: Vec<Uuid>,
    pub amount: i64,
    pub currency: String,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutAuthorization {
    pub intent_id: Uuid,
    pub decision: String,
    pub reason: String,
    pub requires_confirmation: bool,
}
