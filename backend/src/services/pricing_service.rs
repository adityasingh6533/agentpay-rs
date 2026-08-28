use sqlx::PgPool;
use uuid::Uuid;

use crate::{db::queries, errors::AppError};

#[derive(Debug)]
pub struct TrustedCheckout {
    pub amount: i64,
    pub currency: String,
    pub category: String,
}

pub async fn calculate_checkout(
    pool: &PgPool,
    product_ids: &[Uuid],
) -> Result<TrustedCheckout, AppError> {
    if product_ids.is_empty() {
        return Err(AppError::Validation(
            "At least one product is required".to_string(),
        ));
    }

    let products = queries::get_checkout_products(pool, product_ids).await?;

    if products.len() != product_ids.len() {
        return Err(AppError::Validation(
            "One or more products do not exist".to_string(),
        ));
    }

    let mut amount: i64 = 0;

    for product in &products {
        if product.stock <= 0 {
            return Err(AppError::Validation(format!(
                "Product {} is out of stock",
                product.id
            )));
        }

        amount = amount
            .checked_add(product.price)
            .ok_or_else(|| AppError::Validation("Checkout amount overflow".to_string()))?;
    }

    let category = products
        .first()
        .map(|p| p.category.clone())
        .unwrap_or_default();

    Ok(TrustedCheckout {
        amount,
        currency: "INR".to_string(),
        category,
    })
}
