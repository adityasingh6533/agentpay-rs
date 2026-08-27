use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    agent::{
        authorization::AuthorizationDecision, policy::PolicyDecision,
        signed_intent::create_signed_intent,
    },
    db::queries,
    errors::AppError,
    models::{CheckoutAuthorization, CheckoutRequest},
    services::authorization_service,
};

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

    let requires_confirmation = matches!(policy_decision, PolicyDecision::Review);
    if matches!(policy_decision, PolicyDecision::Block) {
        return Ok(CheckoutAuthorization {
            intent_id: Uuid::nil(),
            decision: "BLOCKED".to_string(),
            reason: "Policy engine blocked checkout".to_string(),
            requires_confirmation: false,
        });
    }

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

pub async fn prepare_checkout(
    pool: &PgPool,
    signing_secret: &str,
    request: &CheckoutRequest,
    today_spending: i64,
    policy: &crate::models::SpendingPolicy,
) -> Result<CheckoutAuthorization, AppError> {
    if today_spending + request.amount > policy.daily_transaction_limit {
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
