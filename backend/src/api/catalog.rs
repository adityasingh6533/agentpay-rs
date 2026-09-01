use axum::{
    Json,
    extract::{Path, State},
};
use uuid::Uuid;

use crate::{AppState, errors::AppError, models::AgentCatalog};

pub async fn agent_catalog(
    State(state): State<AppState>,
    Path(merchant_id): Path<Uuid>,
) -> Result<Json<AgentCatalog>, AppError> {
    let catalog =
        crate::services::catalog_service::build_agent_catalog(&state.db, merchant_id).await?;

    Ok(Json(catalog))
}
