use sqlx::PgPool;

use crate::{
    agent::authorization::{AuthorizationDecision, AuthorizationResult, authorize_intent},
    agent::policy::PolicyDecision,
    agent::signed_intent::SignedAgentIntent,
    db::queries,
    errors::AppError,
};

pub async fn authorize(
    pool: &PgPool,
    secret: &str,
    intent: &SignedAgentIntent,
    policy_decision: &PolicyDecision,
) -> Result<AuthorizationResult, AppError> {
    let result = authorize_intent(secret, intent, policy_decision);

    let decision = match result.decision {
        AuthorizationDecision::Authorized => "AUTHORIZED",

        AuthorizationDecision::Review => "REVIEW",

        AuthorizationDecision::Blocked => "BLOCKED",
    };

    let inserted = queries::record_authorization_attempt(
        pool,
        intent.payload.intent_id,
        intent.payload.nonce,
        decision,
        &result.reason,
    )
    .await?;

    if !inserted {
        return Ok(AuthorizationResult {
            decision: AuthorizationDecision::Blocked,
            reason: "Intent has already been processed".to_string(),
        });
    }

    queries::update_signed_intent_status(pool, intent.payload.intent_id, decision).await?;

    Ok(result)
}
