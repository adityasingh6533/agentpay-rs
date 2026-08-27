use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, sqlx::FromRow)]
pub struct SignedAgentIntentRecord {
    pub id: Uuid,
    pub session_id: Uuid,
    pub action: String,
    pub amount: i64,
    pub currency: String,
    pub category: String,
    pub product_ids: Vec<Uuid>,
    pub requires_confirmation: bool,
    pub nonce: Uuid,
    pub issued_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub signature: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
}
