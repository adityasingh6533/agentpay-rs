use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    pub id: Uuid,
    pub customer_id: Uuid,
    pub session_id: Uuid,
    pub amount: i64,
    pub currency: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
}
