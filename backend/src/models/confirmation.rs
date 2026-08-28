use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfirmationRequest {
    pub intent_id: Uuid,
    pub session_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfirmationResponse {
    pub intent_id: Uuid,
    pub status: String,
    pub expires_at: DateTime<Utc>,
}
