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
    services::{authorization_service, pricing_service},
};

/// Creates, signs, persists and authorizes a checkout intent.
///
/// Trusted financial values are supplied by the server-side
/// pricing layer rather than the client.
pub async fn authorize_checkout(
    pool: &PgPool,
    signing_secret: &str,
    request: &CheckoutRequest,
    amount: i64,
    currency: &str,
    category: &str,
    policy_decision: PolicyDecision,
) -> Result<CheckoutAuthorization, AppError> {
    if request.product_ids.is_empty() {
        return Err(AppError::Validation(
            "Checkout requires at least one product".to_string(),
        ));
    }

    if amount <= 0 {
        return Err(AppError::Validation(
            "Checkout amount must be positive".to_string(),
        ));
    }

    if currency.trim().is_empty() {
        return Err(AppError::Validation(
            "Checkout currency is required".to_string(),
        ));
    }

    if category.trim().is_empty() {
        return Err(AppError::Validation(
            "Checkout category is required".to_string(),
        ));
    }

    // Never create a signed intent when policy blocks checkout.
    if matches!(policy_decision, PolicyDecision::Block) {
        return Ok(CheckoutAuthorization {
            intent_id: Uuid::nil(),
            decision: "BLOCKED".to_string(),
            reason: "Policy engine blocked checkout".to_string(),
            amount,
            currency: currency.to_string(),
            requires_confirmation: false,
        });
    }

    let requires_confirmation = matches!(policy_decision, PolicyDecision::Review);

    let intent = create_signed_intent(
        signing_secret,
        request.session_id,
        "CREATE_ORDER",
        amount,
        currency,
        category,
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
        amount,
        currency: currency.to_string(),
        requires_confirmation,
    })
}

/// Calculates trusted pricing from PostgreSQL and then
/// evaluates the spending policy.
///
/// Client supplied amount/category/currency are NOT trusted.
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

    let trusted = pricing_service::calculate_checkout(pool, &request.product_ids).await?;

    if trusted.amount <= 0 {
        return Err(AppError::Validation(
            "Calculated checkout amount must be positive".to_string(),
        ));
    }

    if trusted.currency.trim().is_empty() {
        return Err(AppError::Validation(
            "Calculated checkout currency is empty".to_string(),
        ));
    }

    if trusted.category.trim().is_empty() {
        return Err(AppError::Validation(
            "Calculated checkout category is empty".to_string(),
        ));
    }

    let projected_spending = today_spending
        .checked_add(trusted.amount)
        .ok_or_else(|| AppError::Validation("Daily spending calculation overflowed".to_string()))?;

    if projected_spending > policy.daily_transaction_limit {
        return authorize_checkout(
            pool,
            signing_secret,
            request,
            trusted.amount,
            &trusted.currency,
            &trusted.category,
            PolicyDecision::Block,
        )
        .await;
    }

    let policy_decision = crate::services::policy_service::evaluate(
        pool,
        policy.merchant_id,
        trusted.amount,
        &trusted.category,
        &trusted.currency,
    )
    .await?
    .decision;

    authorize_checkout(
        pool,
        signing_secret,
        request,
        trusted.amount,
        &trusted.currency,
        &trusted.category,
        policy_decision,
    )
    .await
}

/// Executes an authorized signed intent.
///
/// Lifecycle:
///
/// AUTHORIZED
///     ↓
/// PROCESSING
///     ↓
/// Inventory RESERVED
///     ↓
/// Razorpay ORDER CREATED
///     ↓
/// Webhook decides final payment outcome
///
/// Payment success:
///
/// PROCESSING → CONSUMED
/// RESERVED   → COMPLETED
///
/// Payment failure:
///
/// PROCESSING → AUTHORIZED
/// RESERVED   → RELEASED
pub async fn execute_authorized_checkout(
    pool: &PgPool,
    signing_secret: &str,
    razorpay: &crate::integrations::razorpay::client::RazorpayClient,
    intent: &SignedAgentIntent,
    customer_confirmed: bool,
) -> Result<CheckoutResponse, AppError> {
    // -----------------------------------------------------
    // 1. Cryptographic verification
    // -----------------------------------------------------

    verify_signed_intent(signing_secret, intent).map_err(AppError::Validation)?;

    // -----------------------------------------------------
    // 2. Validate action
    // -----------------------------------------------------

    if intent.payload.action != "CREATE_ORDER" {
        return Err(AppError::Validation(
            "Unsupported checkout action".to_string(),
        ));
    }

    if intent.payload.amount <= 0 {
        return Err(AppError::Validation(
            "Signed checkout amount must be positive".to_string(),
        ));
    }

    // -----------------------------------------------------
    // 3. Customer confirmation
    // -----------------------------------------------------

    if intent.payload.requires_confirmation && !customer_confirmed {
        return Err(AppError::Validation(
            "Customer confirmation is required before checkout".to_string(),
        ));
    }

    // -----------------------------------------------------
    // 4. Atomically claim intent
    //
    // AUTHORIZED -> PROCESSING
    //
    // Only ONE concurrent request can succeed.
    // -----------------------------------------------------

    let claimed = queries::claim_signed_intent(pool, intent.payload.intent_id).await?;

    if !claimed {
        return Err(AppError::Validation(
            "Intent is not authorized, expired, already processing, or already consumed"
                .to_string(),
        ));
    }

    // -----------------------------------------------------
    // 5. Reserve inventory
    //
    // IMPORTANT:
    // This happens AFTER the intent is successfully claimed.
    // -----------------------------------------------------

    let reservation_result = crate::services::inventory_service::reserve_checkout_inventory(
        pool,
        intent.payload.intent_id,
        &intent.payload.product_ids,
        intent.payload.expires_at,
    )
    .await;

    if let Err(error) = reservation_result {
        // Reservation failed after intent was claimed.
        // Return the intent to AUTHORIZED so it can be retried.
        let _ = queries::release_signed_intent(pool, intent.payload.intent_id).await;

        return Err(error);
    }

    // -----------------------------------------------------
    // 6. Create Razorpay order
    // -----------------------------------------------------

    let receipt = format!("agentpay_{}", intent.payload.intent_id);

    let order_result = crate::integrations::razorpay::orders::create_order(
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
    .await;

    let order = match order_result {
        Ok(order) => order,

        Err(error) => {
            // Razorpay order creation failed.
            //
            // Release both:
            // PROCESSING -> AUTHORIZED
            // RESERVED   -> RELEASED
            let _ = crate::services::inventory_service::release_checkout_inventory(
                pool,
                intent.payload.intent_id,
            )
            .await;

            let _ = queries::release_signed_intent(pool, intent.payload.intent_id).await;

            let _ = queries::create_audit_event(
                pool,
                intent.payload.session_id,
                "RAZORPAY_ORDER_FAILED",
                "AGENT",
                "FAILED",
                "Razorpay order creation failed; intent and inventory released for retry.",
                serde_json::json!({
                    "intent_id":
                        intent.payload.intent_id,

                    "error":
                        error.to_string(),
                }),
            )
            .await;

            return Err(AppError::External(error));
        }
    };

    queries::create_checkout_for_intent(pool, intent, &order.id).await?;

    // -----------------------------------------------------
    // 7. IMPORTANT:
    //
    // Do NOT mark intent CONSUMED here.
    //
    // Razorpay ORDER_CREATED != PAYMENT_SUCCESS.
    //
    // The webhook will finalize the payment lifecycle.
    // -----------------------------------------------------

    queries::create_audit_event(
        pool,
        intent.payload.session_id,
        "RAZORPAY_ORDER_CREATED",
        "AGENT",
        "SUCCESS",
        "Authorized agent intent was converted into a Razorpay order; awaiting payment webhook.",
        serde_json::json!({
            "intent_id":
                intent.payload.intent_id,

            "razorpay_order_id":
                order.id,

            "amount":
                intent.payload.amount,

            "razorpay_amount":
                order.amount,

            "currency":
                order.currency,

            "razorpay_entity":
                order.entity,

            "razorpay_status":
                order.status,

            "amount_paid":
                order.amount_paid,

            "amount_due":
                order.amount_due,

            "receipt":
                order.receipt,
        }),
    )
    .await?;

    Ok(CheckoutResponse {
        status: "ORDER_CREATED".to_string(),
        intent_id: intent.payload.intent_id,
        razorpay_order_id: Some(order.id),
        amount: Some(intent.payload.amount),
        currency: Some(order.currency),
        message: "Razorpay order created successfully; awaiting payment confirmation".to_string(),
    })
}

/// Executes checkout using the persisted signed intent.
///
/// Flow:
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
/// AUTHORIZED -> PROCESSING
///      ↓
/// inventory reservation
///      ↓
/// Razorpay order
///      ↓
/// webhook
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

    if record.status == "PROCESSING" {
        return Err(AppError::Validation(
            "Agent intent is already being processed".to_string(),
        ));
    }

    tracing::debug!(
        intent_id = %record.id,
        created_at = %record.created_at,
        "Loaded persisted checkout intent"
    );

    let intent = record_to_signed_intent(record);

    verify_signed_intent(signing_secret, &intent).map_err(AppError::Validation)?;

    // -----------------------------------------------------
    // Customer confirmation
    // -----------------------------------------------------

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

    let customer_confirmed = intent.payload.requires_confirmation;

    execute_authorized_checkout(pool, signing_secret, razorpay, &intent, customer_confirmed).await
}

/// Converts the persisted database record back into
/// the signed intent representation required by the
/// cryptographic verification layer.
fn record_to_signed_intent(record: SignedAgentIntentRecord) -> SignedAgentIntent {
    SignedAgentIntent {
        payload: crate::agent::signed_intent::AgentIntentPayload {
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
