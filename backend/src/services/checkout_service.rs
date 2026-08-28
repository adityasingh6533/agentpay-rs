use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    agent::{
        authorization::AuthorizationDecision,
        policy::PolicyDecision,
        signed_intent::{
            create_signed_intent,
            verify_signed_intent,
            SignedAgentIntent,
        },
    },
    db::queries,
    errors::AppError,
    models::{
        CheckoutAuthorization,
        CheckoutRequest,
        CheckoutResponse,
        SignedAgentIntentRecord,
        SpendingPolicy,
    },
    services::{
        authorization_service,
        pricing_service,
    },
};

/// Creates, signs, persists and authorizes a checkout intent.
///
/// The amount, currency and category supplied to this function
/// must already have been reconstructed from trusted server data.
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

    // A blocked transaction must never produce a signed intent.
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

    let requires_confirmation =
        matches!(policy_decision, PolicyDecision::Review);

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

    // Persist the exact signed intent that will later be verified.
    queries::save_signed_agent_intent(
        pool,
        &intent,
    )
    .await?;

    let authorization =
        authorization_service::authorize(
            pool,
            signing_secret,
            &intent,
            &policy_decision,
        )
        .await?;

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

/// Runs trusted server-side pricing and spending policy
/// before creating an agent intent.
///
/// IMPORTANT:
/// request.amount, request.currency and request.category
/// are NOT trusted for the financial decision.
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

    // Reconstruct the transaction from PostgreSQL.
    let trusted =
        pricing_service::calculate_checkout(
            pool,
            &request.product_ids,
        )
        .await?;

    if trusted.amount <= 0 {
        return Err(AppError::Validation(
            "Calculated checkout amount must be positive"
                .to_string(),
        ));
    }

    if trusted.currency.trim().is_empty() {
        return Err(AppError::Validation(
            "Calculated checkout currency is empty"
                .to_string(),
        ));
    }

    if trusted.category.trim().is_empty() {
        return Err(AppError::Validation(
            "Calculated checkout category is empty"
                .to_string(),
        ));
    }

    let projected_spending =
        today_spending
            .checked_add(trusted.amount)
            .ok_or_else(|| {
                AppError::Validation(
                    "Daily spending calculation overflowed"
                        .to_string(),
                )
            })?;

    if projected_spending
        > policy.daily_transaction_limit
    {
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

    let policy_decision =
        crate::agent::policy::evaluate_transaction(
            policy,
            trusted.amount,
            &trusted.category,
            &trusted.currency,
        )
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

/// Executes an already authorized signed intent.
///
/// The frontend never supplies amount/currency here.
/// These values come from the persisted signed intent.
pub async fn execute_authorized_checkout(
    pool: &PgPool,
    signing_secret: &str,
    razorpay: &crate::integrations::razorpay::client::RazorpayClient,
    intent: &SignedAgentIntent,
    customer_confirmed: bool,
) -> Result<CheckoutResponse, AppError> {
    verify_signed_intent(
        signing_secret,
        intent,
    )
    .map_err(AppError::Validation)?;

    if intent.payload.action != "CREATE_ORDER" {
        return Err(AppError::Validation(
            "Unsupported checkout action".to_string(),
        ));
    }

    if intent.payload.amount <= 0 {
        return Err(AppError::Validation(
            "Signed checkout amount must be positive"
                .to_string(),
        ));
    }

    if intent.payload.requires_confirmation
        && !customer_confirmed
    {
        return Err(AppError::Validation(
            "Customer confirmation is required before checkout"
                .to_string(),
        ));
    }

    // Atomic AUTHORIZED -> CONSUMED transition.
    //
    // Concurrent requests cannot consume the same intent twice.
    let consumed =
        queries::consume_signed_intent(
            pool,
            intent.payload.intent_id,
        )
        .await?;

    if !consumed {
        return Err(AppError::Validation(
            "Intent is not authorized, expired, or already consumed"
                .to_string(),
        ));
    }

    let receipt =
        format!(
            "agentpay_{}",
            intent.payload.intent_id
        );

    let order =
        crate::integrations::razorpay::orders::create_order(
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
        message:
            "Razorpay order created successfully"
                .to_string(),
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
    let record =
        queries::get_signed_agent_intent(
            pool,
            intent_id,
        )
        .await?
        .ok_or_else(|| {
            AppError::Validation(
                "Agent intent not found".to_string(),
            )
        })?;

    if record.session_id != session_id {
        return Err(AppError::Validation(
            "Intent does not belong to this session"
                .to_string(),
        ));
    }

    if record.status == "CONSUMED" {
        return Err(AppError::Validation(
            "Agent intent has already been consumed"
                .to_string(),
        ));
    }

    if record.status == "BLOCKED" {
        return Err(AppError::Validation(
            "Agent intent is blocked".to_string(),
        ));
    }

    let intent =
        record_to_signed_intent(record);

    verify_signed_intent(
        signing_secret,
        &intent,
    )
    .map_err(AppError::Validation)?;

    if intent.payload.requires_confirmation {
        let token =
            confirmation_token.ok_or_else(|| {
                AppError::Validation(
                    "Customer confirmation required"
                        .to_string(),
                )
            })?;

        crate::services::confirmation_service::consume_confirmation(
            pool,
            intent.payload.intent_id,
            intent.payload.session_id,
            token,
        )
        .await?;

        let authorized =
            queries::authorize_confirmed_intent(
                pool,
                intent.payload.intent_id,
            )
            .await?;

        if !authorized {
            return Err(AppError::Validation(
                "Intent could not be authorized after confirmation"
                    .to_string(),
            ));
        }
    }

    let customer_confirmed =
        intent.payload.requires_confirmation;

    execute_authorized_checkout(
        pool,
        signing_secret,
        razorpay,
        &intent,
        customer_confirmed,
    )
    .await
}

/// Converts the persisted DB record back into
/// the cryptographically verifiable signed intent.
fn record_to_signed_intent(
    record: SignedAgentIntentRecord,
) -> SignedAgentIntent {
    SignedAgentIntent {
        payload:
            crate::agent::signed_intent::SignedAgentIntentPayload {
                intent_id: record.id,
                session_id: record.session_id,
                action: record.action,
                amount: record.amount,
                currency: record.currency,
                category: record.category,
                product_ids: record.product_ids,
                requires_confirmation:
                    record.requires_confirmation,
                nonce: record.nonce,
                issued_at: record.issued_at,
                expires_at: record.expires_at,
            },
        signature: record.signature,
    }
}