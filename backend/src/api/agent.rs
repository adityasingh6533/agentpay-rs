use crate::{
    AppState,
    agent::state::{CreateSessionRequest, CreateSessionResponse},
    services::growth_service,
};
use axum::{Json, extract::State, http::StatusCode};
use uuid::Uuid;

use crate::errors::AppError;

pub async fn create_session(
    State(state): State<AppState>,
    Json(payload): Json<CreateSessionRequest>,
) -> Result<(StatusCode, Json<CreateSessionResponse>), AppError> {
    let session = growth_service::start_agent_session(
        &state.db,
        payload.customer_name,
        payload.customer_email,
    )
    .await?;

    Ok((StatusCode::CREATED, Json(CreateSessionResponse { session })))
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct AgentMessageRequest {
    pub session_id: Uuid,
    pub message: String,
}
#[derive(Debug, Serialize)]
pub struct AgentMessageResponse {
    pub result: crate::agent::decision::AgentResult,
}

pub async fn process_message(
    State(state): State<AppState>,
    Json(payload): Json<AgentMessageRequest>,
) -> Result<Json<AgentMessageResponse>, AppError> {
    let result = growth_service::process_agent_message(
        state.config.clone(),
        &state.db,
        payload.session_id,
        &payload.message,
    )
    .await?;

    Ok(Json(AgentMessageResponse { result }))
}
