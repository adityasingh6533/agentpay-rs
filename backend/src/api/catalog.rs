use axum::{
    Json,
    extract::{Path, Query, State},
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    AppState,
    errors::AppError,
    models::{AgentCatalog, Product},
};

#[derive(Debug, Deserialize)]
pub struct ProductListQuery {
    pub search: Option<String>,
    pub category: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub async fn list_products(
    State(state): State<AppState>,
    Query(query): Query<ProductListQuery>,
) -> Result<Json<Vec<Product>>, AppError> {
    let limit = query.limit.unwrap_or(50).clamp(1, 100);
    let offset = query.offset.unwrap_or(0).max(0);

    let category = query
        .category
        .as_deref()
        .filter(|value| !value.eq_ignore_ascii_case("all"));

    let products = crate::db::queries::list_products(
        &state.db,
        category,
        query.search.as_deref(),
        limit,
        offset,
    )
    .await?;

    Ok(Json(products))
}

pub async fn get_product(
    State(state): State<AppState>,
    Path(product_id): Path<Uuid>,
) -> Result<Json<Product>, AppError> {
    let product = crate::db::queries::get_product_by_id(&state.db, product_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Product not found".to_string()))?;

    Ok(Json(product))
}

pub async fn agent_catalog(
    State(state): State<AppState>,
    Path(merchant_id): Path<Uuid>,
) -> Result<Json<AgentCatalog>, AppError> {
    let catalog =
        crate::services::catalog_service::build_agent_catalog(&state.db, merchant_id).await?;

    Ok(Json(catalog))
}
