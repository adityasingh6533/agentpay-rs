use chrono::{DateTime, Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{db::queries, errors::AppError};

/// Reserves inventory for an authorized checkout.
///
/// Inventory is reserved only after authorization/confirmation.
/// The reservation is temporary until payment succeeds.
pub async fn reserve_checkout_inventory(
    pool: &PgPool,
    intent_id: Uuid,
    product_ids: &[Uuid],
    expires_at: DateTime<Utc>,
) -> Result<(), AppError> {
    if product_ids.is_empty() {
        return Err(AppError::Validation(
            "Cannot reserve inventory for an empty checkout".to_string(),
        ));
    }

    if expires_at <= Utc::now() {
        return Err(AppError::Validation(
            "Inventory reservation expiry must be in the future".to_string(),
        ));
    }

    let reserved = queries::reserve_inventory(pool, intent_id, product_ids, expires_at).await?;

    if !reserved {
        return Err(AppError::Validation(
            "One or more products are no longer available".to_string(),
        ));
    }

    Ok(())
}

/// Releases all inventory reserved by an intent.
///
/// Used when Razorpay order creation/payment fails
/// or the reservation expires.
pub async fn release_checkout_inventory(pool: &PgPool, intent_id: Uuid) -> Result<(), AppError> {
    queries::release_inventory(pool, intent_id).await?;

    Ok(())
}

/// Marks reserved inventory as permanently consumed.
///
/// This is called only after payment has been confirmed.
pub async fn complete_checkout_inventory(pool: &PgPool, intent_id: Uuid) -> Result<(), AppError> {
    queries::complete_inventory(pool, intent_id).await?;

    Ok(())
}

/// Default checkout inventory reservation window.
///
/// Inventory remains locked for 15 minutes while
/// the customer completes payment.
pub fn default_reservation_expiry() -> DateTime<Utc> {
    Utc::now() + Duration::minutes(15)
}
