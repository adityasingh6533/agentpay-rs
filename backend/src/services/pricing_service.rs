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

    let first = products
        .first()
        .ok_or_else(|| AppError::Validation("Checkout contains no products".to_string()))?;

    let currency = first.currency.trim().to_uppercase();

    if currency.len() != 3 {
        return Err(AppError::Validation("Invalid product currency".to_string()));
    }

    let category = first.category.trim().to_string();

    if category.is_empty() {
        return Err(AppError::Validation(
            "Product category cannot be empty".to_string(),
        ));
    }

    let mut amount: i64 = 0;

    for product in &products {
        if !product.active {
            return Err(AppError::Validation(format!(
                "Product {} is inactive",
                product.id
            )));
        }

        if product.stock <= 0 {
            return Err(AppError::Validation(format!(
                "Product {} is out of stock",
                product.id
            )));
        }

        if product.currency.trim().to_uppercase() != currency {
            return Err(AppError::Validation(
                "Products with different currencies cannot be combined".to_string(),
            ));
        }

        if product.price < 0 {
            return Err(AppError::Validation(format!(
                "Product {} has an invalid price",
                product.id
            )));
        }

        amount = amount
            .checked_add(product.price)
            .ok_or_else(|| AppError::Validation("Checkout amount overflow".to_string()))?;
    }

    if amount <= 0 {
        return Err(AppError::Validation(
            "Checkout total must be positive".to_string(),
        ));
    }

    Ok(TrustedCheckout {
        amount,
        currency,
        category,
    })
}
