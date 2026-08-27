use crate::agent::policy::PolicyDecision;
use crate::agent::signed_intent::{SignedAgentIntent, verify_signed_intent};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AuthorizationDecision {
    Authorized,
    Review,
    Blocked,
}

#[derive(Debug, Clone)]
pub struct AuthorizationResult {
    pub decision: AuthorizationDecision,
    pub reason: String,
}

pub fn authorize_intent(
    secret: &str,
    intent: &SignedAgentIntent,
    policy_decision: &PolicyDecision,
) -> AuthorizationResult {
    if let Err(reason) = verify_signed_intent(secret, intent) {
        return AuthorizationResult {
            decision: AuthorizationDecision::Blocked,
            reason,
        };
    }

    match policy_decision {
        PolicyDecision::Block => AuthorizationResult {
            decision: AuthorizationDecision::Blocked,
            reason: "Policy engine blocked the transaction".to_string(),
        },

        PolicyDecision::Review => AuthorizationResult {
            decision: AuthorizationDecision::Review,
            reason: "Customer confirmation is required".to_string(),
        },

        PolicyDecision::Pass => AuthorizationResult {
            decision: AuthorizationDecision::Authorized,
            reason: "Intent signature and policy checks passed".to_string(),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::agent::policy::PolicyDecision;
    use crate::agent::signed_intent::create_signed_intent;
    use uuid::Uuid;

    const SECRET: &str = "authorization-test-secret";

    #[test]
    fn authorizes_valid_intent() {
        let intent = create_signed_intent(
            SECRET,
            Uuid::new_v4(),
            "CREATE_ORDER",
            1299,
            "INR",
            "Running",
            vec![],
            false,
        )
        .unwrap();

        let result = authorize_intent(SECRET, &intent, &PolicyDecision::Pass);

        assert_eq!(result.decision, AuthorizationDecision::Authorized);
    }

    #[test]
    fn sends_review_for_confirmation() {
        let intent = create_signed_intent(
            SECRET,
            Uuid::new_v4(),
            "CREATE_ORDER",
            2000,
            "INR",
            "Running",
            vec![],
            true,
        )
        .unwrap();

        let result = authorize_intent(SECRET, &intent, &PolicyDecision::Review);

        assert_eq!(result.decision, AuthorizationDecision::Review);
    }

    #[test]
    fn blocks_policy_failure() {
        let intent = create_signed_intent(
            SECRET,
            Uuid::new_v4(),
            "CREATE_ORDER",
            1299,
            "INR",
            "Running",
            vec![],
            false,
        )
        .unwrap();

        let result = authorize_intent(SECRET, &intent, &PolicyDecision::Block);

        assert_eq!(result.decision, AuthorizationDecision::Blocked);
    }

    #[test]
    fn blocks_tampered_intent() {
        let mut intent = create_signed_intent(
            SECRET,
            Uuid::new_v4(),
            "CREATE_ORDER",
            1299,
            "INR",
            "Running",
            vec![],
            false,
        )
        .unwrap();

        intent.payload.amount = 999999;

        let result = authorize_intent(SECRET, &intent, &PolicyDecision::Pass);

        assert_eq!(result.decision, AuthorizationDecision::Blocked);
    }
}
