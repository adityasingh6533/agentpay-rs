use sqlx::PgPool;

use crate::{db::queries, errors::AppError, models::Product};

pub async fn search(
    pool: &PgPool,
    category: Option<&str>,
    max_price: Option<i64>,
) -> Result<Vec<Product>, AppError> {
    if let Some(price) = max_price {
        if price <= 0 {
            return Err(AppError::Validation("max price must be positive".into()));
        }
    }

    let products = queries::search_products(pool, category, max_price, 10).await?;

    Ok(products)
}
