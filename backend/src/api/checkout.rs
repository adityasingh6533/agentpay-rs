use axum::Json;
use axum::extract::State;

use crate::{
    AppState,
    errors::AppError,
    models::{CheckoutAuthorization, CheckoutRequest, CheckoutResponse, ExecuteCheckoutRequest},
};

pub async fn authorize_checkout(
    State(state): State<AppState>,
    Json(request): Json<CheckoutRequest>,
) -> Result<Json<CheckoutAuthorization>, AppError> {
    let policy = crate::db::queries::get_active_spending_policy(&state.db, request.merchant_id)
        .await?
        .ok_or_else(|| AppError::Validation("No active spending policy configured".to_string()))?;

    let today_spending =
        crate::db::queries::get_today_spending(&state.db, request.customer_id).await?;

    let result = crate::services::checkout_service::prepare_checkout(
        &state.db,
        &state.config.agent_signing_secret,
        &request,
        today_spending,
        &policy,
    )
    .await?;

    Ok(Json(result))
}

pub async fn execute_checkout(
    State(state): State<AppState>,
    Json(request): Json<ExecuteCheckoutRequest>,
) -> Result<Json<CheckoutResponse>, AppError> {
    let result = crate::services::checkout_service::execute_checkout(
        &state.db,
        &state.config.agent_signing_secret,
        &state.razorpay,
        request.session_id,
        request.intent_id,
        request.confirmation_token.as_deref(),
    )
    .await?;

    Ok(Json(result))
}
