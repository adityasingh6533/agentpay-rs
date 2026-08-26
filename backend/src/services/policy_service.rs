use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    agent::policy::{PolicyEvaluation, evaluate_transaction},
    db::queries,
    errors::AppError,
};

pub async fn evaluate(
    pool: &PgPool,
    merchant_id: Uuid,
    amount: i64,
    category: &str,
    currency: &str,
) -> Result<PolicyEvaluation, AppError> {
    let policy = queries::get_active_spending_policy(pool, merchant_id)
        .await?
        .ok_or_else(|| AppError::Validation("No active spending policy configured".to_string()))?;

    Ok(evaluate_transaction(&policy, amount, category, currency))
}
