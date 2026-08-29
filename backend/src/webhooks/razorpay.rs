use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
};
use hmac::{Hmac, Mac};
use serde_json::Value;
use sha2::Sha256;

use crate::{AppState, db::queries};

type HmacSha256 = Hmac<Sha256>;

/// Verifies Razorpay webhook HMAC against the raw request body.
///
/// IMPORTANT:
/// Signature verification must happen BEFORE JSON parsing.
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

pub async fn razorpay_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<StatusCode, StatusCode> {
    // -----------------------------------------------------
    // 1. Read signature
    // -----------------------------------------------------

    let signature = headers
        .get("x-razorpay-signature")
        .and_then(|value| value.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    // -----------------------------------------------------
    // 2. Verify signature BEFORE parsing
    // -----------------------------------------------------

    if !verify_webhook_signature(&state.config.razorpay_webhook_secret, &body, signature) {
        return Err(StatusCode::UNAUTHORIZED);
    }

    // -----------------------------------------------------
    // 3. Read Razorpay event id
    // -----------------------------------------------------

    let event_id = headers
        .get("x-razorpay-event-id")
        .and_then(|value| value.to_str().ok())
        .ok_or(StatusCode::BAD_REQUEST)?;

    if event_id.trim().is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    // -----------------------------------------------------
    // 4. Parse JSON only after signature verification
    // -----------------------------------------------------

    let payload: Value = serde_json::from_slice(&body).map_err(|_| StatusCode::BAD_REQUEST)?;

    let event_type = payload
        .get("event")
        .and_then(Value::as_str)
        .ok_or(StatusCode::BAD_REQUEST)?;

    // -----------------------------------------------------
    // 5. Extract payment entity
    // -----------------------------------------------------

    let payment_entity = payload
        .get("payload")
        .and_then(|value| value.get("payment"))
        .and_then(|value| value.get("entity"));

    let razorpay_order_id = payment_entity
        .and_then(|value| value.get("order_id").and_then(Value::as_str))
        .map(str::to_owned);

    let razorpay_payment_id = payment_entity
        .and_then(|value| value.get("id").and_then(Value::as_str))
        .map(str::to_owned);

    // -----------------------------------------------------
    // 6. Persist event exactly once
    // -----------------------------------------------------

    let inserted = queries::insert_webhook_event(
        &state.db,
        &queries::WebhookEventInsert {
            event_id: event_id.to_string(),
            event_type: event_type.to_string(),
            razorpay_order_id: razorpay_order_id.clone(),
            razorpay_payment_id: razorpay_payment_id.clone(),
            payload: payload.clone(),
        },
    )
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Duplicate webhook.
    //
    // Already persisted, so acknowledge it safely.
    if !inserted {
        return Ok(StatusCode::OK);
    }

    // -----------------------------------------------------
    // 7. Reconcile supported payment events
    // -----------------------------------------------------

    let checkout_status = match event_type {
        "payment.captured" => "PAID",

        "payment.failed" => "FAILED",

        // Other Razorpay events are safely stored
        // but do not mutate checkout state.
        _ => {
            queries::mark_webhook_processed(&state.db, event_id)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            return Ok(StatusCode::OK);
        }
    };

    let Some(order_id) = razorpay_order_id.as_deref() else {
        let _ = queries::mark_webhook_failed(&state.db, event_id).await;

        return Err(StatusCode::BAD_REQUEST);
    };

    // -----------------------------------------------------
    // 8. Update checkout
    // -----------------------------------------------------

    let session_id = queries::update_checkout_from_razorpay(&state.db, order_id, checkout_status)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let Some(_) = session_id else {
        let _ = queries::mark_webhook_failed(&state.db, event_id).await;

        return Err(StatusCode::NOT_FOUND);
    };

    let Some((session_id, intent_id)) = queries::get_checkout_reconciliation(&state.db, order_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    else {
        let _ = queries::mark_webhook_failed(&state.db, event_id).await;

        return Err(StatusCode::NOT_FOUND);
    };

    match event_type {
        "payment.captured" => {
            let finalized = queries::finalize_paid_intent(&state.db, intent_id)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            if !finalized {
                let _ = queries::mark_webhook_failed(&state.db, event_id).await;

                return Err(StatusCode::CONFLICT);
            }

            crate::services::inventory_service::complete_checkout_inventory(&state.db, intent_id)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        }

        "payment.failed" => {
            let released = queries::release_failed_intent(&state.db, intent_id)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            if released {
                crate::services::inventory_service::release_checkout_inventory(
                    &state.db, intent_id,
                )
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            }
        }

        _ => {}
    }

    // -----------------------------------------------------
    // 9. Audit event
    // -----------------------------------------------------

    let audit_status = if checkout_status == "PAID" {
        "SUCCESS"
    } else {
        "FAILED"
    };

    let audit_message = if checkout_status == "PAID" {
        "Razorpay payment captured successfully."
    } else {
        "Razorpay payment failed."
    };

    queries::create_audit_event(
        &state.db,
        session_id,
        event_type,
        "SYSTEM",
        audit_status,
        audit_message,
        serde_json::json!({
            "webhook_event_id":
                event_id,

            "razorpay_order_id":
                order_id,

            "razorpay_payment_id":
                razorpay_payment_id,

            "checkout_status":
                checkout_status,
        }),
    )
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // -----------------------------------------------------
    // 10. Mark webhook processed
    // -----------------------------------------------------

    queries::mark_webhook_processed(&state.db, event_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::OK)
}
