use chrono::{Duration, Utc};
use rand::{RngCore, rngs::OsRng};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    errors::AppError,
    models::{ConfirmationRequest, ConfirmationResponse},
};

const CONFIRMATION_TTL_MINUTES: i64 = 5;

fn generate_token() -> String {
    let mut bytes = [0u8; 32];

    OsRng.fill_bytes(&mut bytes);

    hex::encode(bytes)
}

fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();

    hasher.update(token.as_bytes());

    hex::encode(hasher.finalize())
}

pub async fn create_confirmation(
    pool: &PgPool,
    request: &ConfirmationRequest,
) -> Result<(ConfirmationResponse, String), AppError> {
    let token = generate_token();
    let token_hash = hash_token(&token);

    let now = Utc::now();
    let expires_at = now + Duration::minutes(CONFIRMATION_TTL_MINUTES);

    sqlx::query(
        r#"
        INSERT INTO checkout_confirmations (
            id,
            intent_id,
            session_id,
            token_hash,
            expires_at
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (intent_id)
        DO UPDATE SET
            token_hash = EXCLUDED.token_hash,
            expires_at = EXCLUDED.expires_at,
            consumed_at = NULL
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(request.intent_id)
    .bind(request.session_id)
    .bind(token_hash)
    .bind(expires_at)
    .execute(pool)
    .await?;

    Ok((
        ConfirmationResponse {
            intent_id: request.intent_id,
            status: "PENDING".to_string(),
            expires_at,
        },
        token,
    ))
}

pub async fn consume_confirmation(
    pool: &PgPool,
    intent_id: Uuid,
    session_id: Uuid,
    token: &str,
) -> Result<(), AppError> {
    if token.trim().is_empty() {
        return Err(AppError::Validation(
            "Confirmation token is required".to_string(),
        ));
    }

    let token_hash = hash_token(token);

    let result = sqlx::query(
        r#"
        UPDATE checkout_confirmations
        SET consumed_at = NOW()
        WHERE intent_id = $1
          AND session_id = $2
          AND token_hash = $3
          AND consumed_at IS NULL
          AND expires_at > NOW()
        "#,
    )
    .bind(intent_id)
    .bind(session_id)
    .bind(token_hash)
    .execute(pool)
    .await?;

    if result.rows_affected() != 1 {
        return Err(AppError::Validation(
            "Invalid, expired, or already-used confirmation token".to_string(),
        ));
    }

    Ok(())
}
