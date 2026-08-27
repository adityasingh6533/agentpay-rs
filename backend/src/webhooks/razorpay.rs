use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

pub fn verify_webhook_signature(secret: &str, raw_body: &[u8], signature: &str) -> bool {
    let Ok(mut mac) = HmacSha256::new_from_slice(secret.as_bytes()) else {
        return false;
    };

    mac.update(raw_body);

    let Ok(expected) = hex::decode(signature) else {
        return false;
    };

    mac.verify_slice(&expected).is_ok()
}

use axum::{body::Bytes, extract::State, http::HeaderMap, http::StatusCode};

use crate::AppState;

pub async fn razorpay_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<StatusCode, StatusCode> {
    let signature = headers
        .get("x-razorpay-signature")
        .and_then(|value| value.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    if !verify_webhook_signature(&state.config.razorpay_webhook_secret, &body, signature) {
        return Err(StatusCode::UNAUTHORIZED);
    }

    // Event processing will be added after
    // payment persistence is wired.

    Ok(StatusCode::OK)
}
