use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Campaign {
    pub id: Uuid,
    pub merchant_id: Uuid,
    pub name: String,
    pub active: bool,
    pub created_at: DateTime<Utc>,
}
