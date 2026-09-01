use axum::{
    Json, Router,
    extract::State,
    routing::{get, post},
};

use super::{catalog, checkout};

use crate::api::agent_catalog;
use crate::{AppState, errors::AppError, webhooks};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
}

async fn health(State(state): State<AppState>) -> Result<Json<HealthResponse>, AppError> {
    sqlx::query("SELECT 1").execute(&state.db).await?;

    Ok(Json(HealthResponse {
        status: "ok",
        service: "agentpay-backend",
    }))
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health))
        .route("/agent/sessions", post(super::agent::create_session))
        .route(
            "/agent/sessions/{session_id}/audit",
            get(super::agent::get_audit_trail),
        )
        .route("/agent/message", post(super::agent::process_message))
        .route("/checkout/authorize", post(checkout::authorize_checkout))
        .route("/checkout/execute", post(checkout::execute_checkout))
        .route(
            "/webhooks/razorpay",
            post(webhooks::razorpay::razorpay_webhook),
        )
        .route(
            "/checkout/confirmation",
            post(checkout::request_confirmation),
        )
        .route("/agent/catalog", get(agent_catalog::get_agent_catalog))
        .route(
            "/agent/catalog/{merchant_id}",
            get(catalog::agent_catalog),
        )
}
