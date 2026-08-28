use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    agent::{
        authorization::AuthorizationDecision,
        policy::PolicyDecision,
        signed_intent::{SignedAgentIntent, create_signed_intent, verify_signed_intent},
    },
    db::queries,
    errors::AppError,
    models::{
        CheckoutAuthorization, CheckoutRequest, CheckoutResponse, SignedAgentIntentRecord,
        SpendingPolicy,
    },
    services::authorization_service,
};

/// Creates, signs, persists and authorizes a checkout intent.
///
/// Flow:
/// Policy -> Signed Intent -> Persist -> Authorization
pub async fn authorize_checkout(
    pool: &PgPool,
    signing_secret: &str,
    request: &CheckoutRequest,
    policy_decision: PolicyDecision,
) -> Result<CheckoutAuthorization, AppError> {
    if request.product_ids.is_empty() {
        return Err(AppError::Validation(
            "Checkout requires at least one product".to_string(),
        ));
    }

    if request.amount <= 0 {
        return Err(AppError::Validation(
            "Checkout amount must be positive".to_string(),
        ));
    }

    // Never create an intent when policy already blocks checkout.
    if matches!(policy_decision, PolicyDecision::Block) {
        return Ok(CheckoutAuthorization {
            intent_id: Uuid::nil(),
            decision: "BLOCKED".to_string(),
            reason: "Policy engine blocked checkout".to_string(),
            requires_confirmation: false,
        });
    }

    let requires_confirmation = matches!(policy_decision, PolicyDecision::Review);

    let intent = create_signed_intent(
        signing_secret,
        request.session_id,
        "CREATE_ORDER",
        request.amount,
        &request.currency,
        &request.category,
        request.product_ids.clone(),
        requires_confirmation,
    )
    .map_err(AppError::Validation)?;

    queries::save_signed_agent_intent(pool, &intent).await?;

    let authorization =
        authorization_service::authorize(pool, signing_secret, &intent, &policy_decision).await?;

    let decision = match authorization.decision {
        AuthorizationDecision::Authorized => "AUTHORIZED",
        AuthorizationDecision::Review => "REVIEW",
        AuthorizationDecision::Blocked => "BLOCKED",
    };

    Ok(CheckoutAuthorization {
        intent_id: intent.payload.intent_id,
        decision: decision.to_string(),
        reason: authorization.reason,
        requires_confirmation,
    })
}

/// Runs the spending policy before creating an agent intent.
pub async fn prepare_checkout(
    pool: &PgPool,
    signing_secret: &str,
    request: &CheckoutRequest,
    today_spending: i64,
    policy: &SpendingPolicy,
) -> Result<CheckoutAuthorization, AppError> {
    if today_spending < 0 {
        return Err(AppError::Validation(
            "Invalid daily spending state".to_string(),
        ));
    }

    let projected_spending = today_spending
        .checked_add(request.amount)
        .ok_or_else(|| AppError::Validation("Daily spending calculation overflowed".to_string()))?;

    if projected_spending > policy.daily_transaction_limit {
        return authorize_checkout(pool, signing_secret, request, PolicyDecision::Block).await;
    }

    let policy_decision = crate::agent::policy::evaluate_transaction(
        policy,
        request.amount,
        &request.category,
        &request.currency,
    )
    .decision;

    authorize_checkout(pool, signing_secret, request, policy_decision).await
}

/// Executes an already authorized signed intent.
///
/// IMPORTANT:
/// The frontend never supplies the amount or currency here.
/// Those values are reconstructed from the persisted signed intent.
pub async fn execute_authorized_checkout(
    pool: &PgPool,
    signing_secret: &str,
    razorpay: &crate::integrations::razorpay::client::RazorpayClient,
    intent: &SignedAgentIntent,
    customer_confirmed: bool,
) -> Result<CheckoutResponse, AppError> {
    // Verify the persisted intent before consuming it.
    verify_signed_intent(signing_secret, intent).map_err(AppError::Validation)?;

    if intent.payload.action != "CREATE_ORDER" {
        return Err(AppError::Validation(
            "Unsupported checkout action".to_string(),
        ));
    }

    if intent.payload.requires_confirmation && !customer_confirmed {
        return Err(AppError::Validation(
            "Customer confirmation is required before checkout".to_string(),
        ));
    }

    // Atomic state transition:
    //
    // AUTHORIZED -> CONSUMED
    //
    // Only one request can successfully consume the intent.
    let consumed = queries::consume_signed_intent(pool, intent.payload.intent_id).await?;

    if !consumed {
        return Err(AppError::Validation(
            "Intent is not authorized, expired, or already consumed".to_string(),
        ));
    }

    let receipt = format!("agentpay_{}", intent.payload.intent_id);

    let order = crate::integrations::razorpay::orders::create_order(
        razorpay,
        intent.payload.amount,
        &intent.payload.currency,
        &receipt,
        Some(serde_json::json!({
            "agent_intent_id":
                intent.payload.intent_id,
            "session_id":
                intent.payload.session_id,
        })),
    )
    .await
    .map_err(AppError::External)?;

    queries::create_audit_event(
        pool,
        intent.payload.session_id,
        "RAZORPAY_ORDER_CREATED",
        "AGENT",
        "SUCCESS",
        "Authorized agent intent was converted into a Razorpay order.",
        serde_json::json!({
            "intent_id":
                intent.payload.intent_id,
            "razorpay_order_id":
                order.id,
            "amount":
                order.amount,
            "currency":
                order.currency,
        }),
    )
    .await?;

    Ok(CheckoutResponse {
        status: "ORDER_CREATED".to_string(),
        intent_id: intent.payload.intent_id,
        razorpay_order_id: Some(order.id),
        amount: Some(order.amount),
        currency: Some(order.currency),
        message: "Razorpay order created successfully".to_string(),
    })
}

/// Executes checkout using the persisted intent.
///
/// This is the safe endpoint path:
///
/// request.intent_id
///      ↓
/// DB signed intent
///      ↓
/// session validation
///      ↓
/// HMAC verification
///      ↓
/// confirmation validation
///      ↓
/// atomic consumption
///      ↓
/// Razorpay
pub async fn execute_checkout(
    pool: &PgPool,
    signing_secret: &str,
    razorpay: &crate::integrations::razorpay::client::RazorpayClient,
    session_id: Uuid,
    intent_id: Uuid,
    confirmation_token: Option<&str>,
) -> Result<CheckoutResponse, AppError> {
    let record = queries::get_signed_agent_intent(pool, intent_id)
        .await?
        .ok_or_else(|| AppError::Validation("Agent intent not found".to_string()))?;

    if record.session_id != session_id {
        return Err(AppError::Validation(
            "Intent does not belong to this session".to_string(),
        ));
    }

    if record.status == "CONSUMED" {
        return Err(AppError::Validation(
            "Agent intent has already been consumed".to_string(),
        ));
    }

    if record.status == "BLOCKED" {
        return Err(AppError::Validation("Agent intent is blocked".to_string()));
    }

    let intent = record_to_signed_intent(record);

    verify_signed_intent(signing_secret, &intent).map_err(AppError::Validation)?;

    if intent.payload.requires_confirmation {
        let token = confirmation_token
            .ok_or_else(|| AppError::Validation("Customer confirmation required".to_string()))?;

        crate::services::confirmation_service::consume_confirmation(
            pool,
            intent.payload.intent_id,
            intent.payload.session_id,
            token,
        )
        .await?;

        let authorized =
            queries::authorize_confirmed_intent(pool, intent.payload.intent_id).await?;

        if !authorized {
            return Err(AppError::Validation(
                "Intent could not be authorized after confirmation".to_string(),
            ));
        }
    }
    let customer_confirmed = if intent.payload.requires_confirmation {
        true
    } else {
        false
    };

    execute_authorized_checkout(pool, signing_secret, razorpay, &intent, customer_confirmed).await
}

/// Converts the persisted database record back into
/// the signed intent representation used by the
/// cryptographic verification layer.
fn record_to_signed_intent(record: SignedAgentIntentRecord) -> SignedAgentIntent {
    SignedAgentIntent {
        payload: crate::agent::signed_intent::SignedAgentIntentPayload {
            intent_id: record.id,
            session_id: record.session_id,
            action: record.action,
            amount: record.amount,
            currency: record.currency,
            category: record.category,
            product_ids: record.product_ids,
            requires_confirmation: record.requires_confirmation,
            nonce: record.nonce,
            issued_at: record.issued_at,
            expires_at: record.expires_at,
        },
        signature: record.signature,
    }
}
