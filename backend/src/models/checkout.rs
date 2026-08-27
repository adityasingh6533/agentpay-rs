use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutRequest {
    pub session_id: Uuid,
    pub customer_id: Uuid,
    pub merchant_id: Uuid,
    pub amount: i64,
    pub currency: String,
    pub category: String,
    pub product_ids: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteCheckoutRequest {
    pub session_id: Uuid,
    pub customer_id: Uuid,
    pub merchant_id: Uuid,
    pub intent_id: Uuid,
    pub confirmation_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutAuthorization {
    pub intent_id: Uuid,
    pub decision: String,
    pub reason: String,
    pub requires_confirmation: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutResponse {
    pub status: String,
    pub intent_id: Uuid,
    pub razorpay_order_id: Option<String>,
    pub amount: Option<i64>,
    pub currency: Option<String>,
    pub message: String,
}
