use axum::Json;
use axum::extract::State;
use hmac::{Hmac, Mac};
use sha2::Sha256;

use crate::{
    AppState,
    errors::AppError,
    models::{
        CheckoutAuthorization, CheckoutRequest, CheckoutResponse, ExecuteCheckoutRequest,
        VerifyPaymentRequest, VerifyPaymentResponse,
    },
};

use crate::models::{ConfirmationRequest, ConfirmationResponse};

pub async fn authorize_checkout(
    State(state): State<AppState>,
    Json(request): Json<CheckoutRequest>,
) -> Result<Json<CheckoutAuthorization>, AppError> {
    let policy = crate::db::queries::get_active_spending_policy(&state.db, request.merchant_id)
        .await?
        .ok_or_else(|| AppError::Validation("No active spending policy configured".to_string()))?;

    let today_spending =
        crate::db::queries::get_today_spending(&state.db, request.customer_id).await?;

    let result = crate::services::checkout_service::prepare_checkout(
        &state.db,
        &state.config.agent_signing_secret,
        &request,
        today_spending,
        &policy,
    )
    .await?;

    Ok(Json(result))
}

pub async fn execute_checkout(
    State(state): State<AppState>,
    Json(request): Json<ExecuteCheckoutRequest>,
) -> Result<Json<CheckoutResponse>, AppError> {
    let result = crate::services::checkout_service::execute_checkout(
        &state.db,
        &state.config.agent_signing_secret,
        &state.razorpay,
        request.session_id,
        request.intent_id,
        request.confirmation_token.as_deref(),
    )
    .await?;

    Ok(Json(result))
}

pub async fn verify_payment(
    State(state): State<AppState>,
    Json(request): Json<VerifyPaymentRequest>,
) -> Result<Json<VerifyPaymentResponse>, AppError> {
    if request.razorpay_order_id.trim().is_empty()
        || request.razorpay_payment_id.trim().is_empty()
        || request.razorpay_signature.trim().is_empty()
    {
        return Err(AppError::Validation(
            "Razorpay payment verification payload is incomplete".to_string(),
        ));
    }

    if !verify_payment_signature(
        &state.config.razorpay_key_secret,
        &request.razorpay_order_id,
        &request.razorpay_payment_id,
        &request.razorpay_signature,
    ) {
        return Err(AppError::Unauthorized);
    }

    let Some((checkout_session_id, checkout_intent_id)) =
        crate::db::queries::get_checkout_reconciliation(&state.db, &request.razorpay_order_id)
            .await?
    else {
        return Err(AppError::NotFound(
            "Razorpay order does not belong to a known checkout".to_string(),
        ));
    };

    if checkout_session_id != request.session_id || checkout_intent_id != request.intent_id {
        return Err(AppError::Forbidden);
    }

    crate::db::queries::reconcile_successful_payment(
        &state.db,
        &request.razorpay_order_id,
        request.intent_id,
    )
    .await?;

    crate::db::queries::create_audit_event(
        &state.db,
        request.session_id,
        "RAZORPAY_CHECKOUT_VERIFIED",
        "SYSTEM",
        "SUCCESS",
        "Razorpay Checkout payment signature verified and transaction reconciled.",
        serde_json::json!({
            "razorpay_order_id": request.razorpay_order_id,
            "razorpay_payment_id": request.razorpay_payment_id,
            "agent_intent_id": request.intent_id,
            "checkout_status": "PAID",
            "verification_source": "checkout_success_handler",
        }),
    )
    .await?;

    Ok(Json(VerifyPaymentResponse {
        status: "PAID".to_string(),
        intent_id: request.intent_id,
        razorpay_order_id: request.razorpay_order_id,
        razorpay_payment_id: request.razorpay_payment_id,
        message: "Payment signature verified; checkout marked paid.".to_string(),
    }))
}

pub async fn request_confirmation(
    State(state): State<AppState>,
    Json(request): Json<ConfirmationRequest>,
) -> Result<Json<ConfirmationResponse>, AppError> {
    let record = crate::db::queries::get_signed_agent_intent(&state.db, request.intent_id)
        .await?
        .ok_or_else(|| AppError::Validation("Agent intent not found".to_string()))?;

    if record.session_id != request.session_id {
        return Err(AppError::Validation(
            "Intent does not belong to this session".to_string(),
        ));
    }

    if !record.requires_confirmation {
        return Err(AppError::Validation(
            "This intent does not require confirmation".to_string(),
        ));
    }

    let (response, token) =
        crate::services::confirmation_service::create_confirmation(&state.db, &request).await?;

    // IMPORTANT:
    // In production the token is delivered
    // through an authenticated customer channel.
    //
    // For the hackathon API response we expose it
    // only because there is no notification provider yet.
    //
    // Never persist the raw token.

    tracing::info!(
        intent_id = %request.intent_id,
        "Customer confirmation generated"
    );

    Ok(Json(ConfirmationResponse {
        intent_id: response.intent_id,
        status: format!("{}:{}", response.status, token),
        expires_at: response.expires_at,
    }))
}

type HmacSha256 = Hmac<Sha256>;

fn verify_payment_signature(
    secret: &str,
    order_id: &str,
    payment_id: &str,
    signature: &str,
) -> bool {
    let Ok(mut mac) = HmacSha256::new_from_slice(secret.as_bytes()) else {
        return false;
    };

    mac.update(format!("{order_id}|{payment_id}").as_bytes());

    let Ok(expected) = hex::decode(signature) else {
        return false;
    };

    mac.verify_slice(&expected).is_ok()
}

#[cfg(test)]
mod tests {
    use super::verify_payment_signature;
    use hmac::{Hmac, Mac};
    use sha2::Sha256;

    #[test]
    fn verifies_valid_razorpay_payment_signature() {
        let secret = "test_secret";
        let order_id = "order_123";
        let payment_id = "pay_123";

        let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).unwrap();
        mac.update(format!("{order_id}|{payment_id}").as_bytes());
        let signature = hex::encode(mac.finalize().into_bytes());

        assert!(verify_payment_signature(
            secret, order_id, payment_id, &signature
        ));
    }

    #[test]
    fn rejects_tampered_razorpay_payment_signature() {
        let secret = "test_secret";
        let order_id = "order_123";
        let payment_id = "pay_123";

        let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).unwrap();
        mac.update(format!("{order_id}|{payment_id}").as_bytes());
        let signature = hex::encode(mac.finalize().into_bytes());

        assert!(!verify_payment_signature(
            secret,
            order_id,
            "pay_tampered",
            &signature
        ));
    }
}
