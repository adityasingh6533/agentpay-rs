use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SpendingPolicy {
    pub id: Uuid,
    pub merchant_id: Uuid,
    pub max_transaction_amount: i64,
    pub daily_transaction_limit: i64,
    pub requires_confirmation_above: i64,
    pub allowed_categories: Vec<String>,
    pub currency: String,
    pub active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
