use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutRequest {
    pub session_id: Uuid,
    pub customer_id: Uuid,
    pub merchant_id: Uuid,
    pub product_ids: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteCheckoutRequest {
    pub session_id: Uuid,
    pub intent_id: Uuid,
    pub confirmation_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyPaymentRequest {
    pub session_id: Uuid,
    pub intent_id: Uuid,
    pub razorpay_order_id: String,
    pub razorpay_payment_id: String,
    pub razorpay_signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutAuthorization {
    pub intent_id: Uuid,
    pub decision: String,
    pub reason: String,
    pub requires_confirmation: bool,
    pub amount: i64,
    pub currency: String,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyPaymentResponse {
    pub status: String,
    pub intent_id: Uuid,
    pub razorpay_order_id: String,
    pub razorpay_payment_id: String,
    pub message: String,
}
