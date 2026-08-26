use serde::{Deserialize, Serialize};

use crate::models::SpendingPolicy;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PolicyDecision {
    Pass,
    Review,
    Block,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyEvaluation {
    pub decision: PolicyDecision,
    pub reasons: Vec<String>,
}

pub fn evaluate_transaction(
    policy: &SpendingPolicy,
    amount: i64,
    category: &str,
    currency: &str,
) -> PolicyEvaluation {
    let mut reasons = Vec::new();

    if !policy.active {
        return PolicyEvaluation {
            decision: PolicyDecision::Block,
            reasons: vec!["Spending policy is inactive".to_string()],
        };
    }

    if amount <= 0 {
        return PolicyEvaluation {
            decision: PolicyDecision::Block,
            reasons: vec!["Transaction amount must be positive".to_string()],
        };
    }

    if currency != policy.currency {
        return PolicyEvaluation {
            decision: PolicyDecision::Block,
            reasons: vec!["Transaction currency is not allowed".to_string()],
        };
    }

    if amount > policy.max_transaction_amount {
        return PolicyEvaluation {
            decision: PolicyDecision::Block,
            reasons: vec!["Transaction exceeds maximum allowed amount".to_string()],
        };
    }

    let category_allowed = policy
        .allowed_categories
        .iter()
        .any(|allowed| allowed.eq_ignore_ascii_case(category));

    if !category_allowed {
        return PolicyEvaluation {
            decision: PolicyDecision::Block,
            reasons: vec!["Product category is not allowed".to_string()],
        };
    }

    reasons.push("Transaction is within spending limit".to_string());

    reasons.push("Product category is allowed".to_string());

    if amount > policy.requires_confirmation_above {
        reasons.push("Customer confirmation is required".to_string());

        return PolicyEvaluation {
            decision: PolicyDecision::Review,
            reasons,
        };
    }

    reasons.push("Transaction does not require additional confirmation".to_string());

    PolicyEvaluation {
        decision: PolicyDecision::Pass,
        reasons,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::SpendingPolicy;

    fn policy() -> SpendingPolicy {
        SpendingPolicy {
            id: uuid::Uuid::new_v4(),
            merchant_id: uuid::Uuid::new_v4(),
            max_transaction_amount: 5000,
            daily_transaction_limit: 20000,
            requires_confirmation_above: 1500,
            allowed_categories: vec!["Running".to_string(), "Accessories".to_string()],
            currency: "INR".to_string(),
            active: true,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        }
    }

    #[test]
    fn allows_safe_transaction() {
        let result = evaluate_transaction(&policy(), 1299, "Running", "INR");

        assert!(matches!(result.decision, PolicyDecision::Pass));
    }

    #[test]
    fn requires_review_above_confirmation_limit() {
        let result = evaluate_transaction(&policy(), 2000, "Running", "INR");

        assert!(matches!(result.decision, PolicyDecision::Review));
    }

    #[test]
    fn blocks_amount_above_limit() {
        let result = evaluate_transaction(&policy(), 6000, "Running", "INR");

        assert!(matches!(result.decision, PolicyDecision::Block));
    }

    #[test]
    fn blocks_unknown_category() {
        let result = evaluate_transaction(&policy(), 999, "Electronics", "INR");

        assert!(matches!(result.decision, PolicyDecision::Block));
    }
}
