use axum::{
    Json,
    extract::{Path, State},
};
use uuid::Uuid;

use crate::{AppState, errors::AppError, models::SpendingPolicy};

pub async fn get_policy(
    State(state): State<AppState>,
    Path(merchant_id): Path<Uuid>,
) -> Result<Json<SpendingPolicy>, AppError> {
    let policy = crate::db::queries::get_active_spending_policy(&state.db, merchant_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Active spending policy not found".to_string()))?;

    Ok(Json(policy))
}
