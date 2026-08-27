use chrono::{DateTime, Duration, Utc};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use uuid::Uuid;

use crate::errors::AppError;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SignedAgentIntentPayload {
    pub intent_id: Uuid,
    pub session_id: Uuid,
    pub action: String,
    pub amount: i64,
    pub currency: String,
    pub category: String,
    pub product_ids: Vec<Uuid>,
    pub requires_confirmation: bool,
    pub nonce: Uuid,
    pub issued_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SignedAgentIntent {
    pub payload: SignedAgentIntentPayload,
    pub signature: String,
}

pub fn create_signed_intent(
    secret: &str,
    session_id: Uuid,
    action: &str,
    amount: i64,
    currency: &str,
    category: &str,
    product_ids: Vec<Uuid>,
    requires_confirmation: bool,
) -> Result<SignedAgentIntent, String> {
    SignedAgentIntent::issue(
        IssueSignedAgentIntent {
            session_id,
            action: action.to_string(),
            amount,
            currency: currency.to_string(),
            category: category.to_string(),
            product_ids,
            requires_confirmation,
            ttl: None,
        },
        secret,
    )
    .map_err(|error| error.to_string())
}

pub fn verify_signed_intent(secret: &str, intent: &SignedAgentIntent) -> Result<(), String> {
    intent.verify(secret).map_err(|error| error.to_string())
}

impl SignedAgentIntent {
    pub fn issue(input: IssueSignedAgentIntent, signing_secret: &str) -> Result<Self, AppError> {
        validate_secret(signing_secret)?;

        if input.action.trim().is_empty() {
            return Err(AppError::Validation("intent action cannot be empty".into()));
        }

        if input.amount <= 0 {
            return Err(AppError::Validation(
                "intent amount must be positive".into(),
            ));
        }

        if input.currency.trim().is_empty() {
            return Err(AppError::Validation(
                "intent currency cannot be empty".into(),
            ));
        }

        if input.category.trim().is_empty() {
            return Err(AppError::Validation(
                "intent category cannot be empty".into(),
            ));
        }

        let issued_at = Utc::now();
        let payload = SignedAgentIntentPayload {
            intent_id: Uuid::new_v4(),
            session_id: input.session_id,
            action: input.action.trim().to_string(),
            amount: input.amount,
            currency: input.currency.trim().to_uppercase(),
            category: input.category.trim().to_string(),
            product_ids: input.product_ids,
            requires_confirmation: input.requires_confirmation,
            nonce: Uuid::new_v4(),
            issued_at,
            expires_at: issued_at + input.ttl.unwrap_or_else(|| Duration::minutes(15)),
        };

        if payload.expires_at <= payload.issued_at {
            return Err(AppError::Validation(
                "intent expiry must be in the future".into(),
            ));
        }

        let signature = sign_payload(&payload, signing_secret)?;

        Ok(Self { payload, signature })
    }

    pub fn verify(&self, signing_secret: &str) -> Result<(), AppError> {
        validate_secret(signing_secret)?;

        if self.payload.expires_at <= Utc::now() {
            return Err(AppError::Unauthorized);
        }

        let expected = sign_payload(&self.payload, signing_secret)?;

        if constant_time_eq(self.signature.as_bytes(), expected.as_bytes()) {
            Ok(())
        } else {
            Err(AppError::Unauthorized)
        }
    }
}

#[derive(Debug, Clone)]
pub struct IssueSignedAgentIntent {
    pub session_id: Uuid,
    pub action: String,
    pub amount: i64,
    pub currency: String,
    pub category: String,
    pub product_ids: Vec<Uuid>,
    pub requires_confirmation: bool,
    pub ttl: Option<Duration>,
}

fn sign_payload(
    payload: &SignedAgentIntentPayload,
    signing_secret: &str,
) -> Result<String, AppError> {
    let mut mac = HmacSha256::new_from_slice(signing_secret.as_bytes())
        .map_err(|_| AppError::Config("invalid agent signing secret".into()))?;
    let canonical = serde_json::to_vec(payload).map_err(|_| AppError::Internal)?;

    mac.update(&canonical);

    Ok(hex::encode(mac.finalize().into_bytes()))
}

fn validate_secret(signing_secret: &str) -> Result<(), AppError> {
    if signing_secret.trim().is_empty() {
        return Err(AppError::Config(
            "AGENT_SIGNING_SECRET must be set before signing intents".into(),
        ));
    }

    Ok(())
}

fn constant_time_eq(left: &[u8], right: &[u8]) -> bool {
    if left.len() != right.len() {
        return false;
    }

    left.iter()
        .zip(right.iter())
        .fold(0, |diff, (left, right)| diff | (left ^ right))
        == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input() -> IssueSignedAgentIntent {
        IssueSignedAgentIntent {
            session_id: Uuid::new_v4(),
            action: "checkout".to_string(),
            amount: 1299,
            currency: "usd".to_string(),
            category: "Running".to_string(),
            product_ids: vec![Uuid::new_v4()],
            requires_confirmation: true,
            ttl: Some(Duration::minutes(5)),
        }
    }

    #[test]
    fn signed_intent_verifies_with_original_payload() {
        let intent = SignedAgentIntent::issue(input(), "test-secret").unwrap();

        assert_eq!(intent.signature.len(), 64);
        assert_eq!(intent.payload.currency, "USD");
        assert!(intent.verify("test-secret").is_ok());
    }

    #[test]
    fn signed_intent_rejects_tampered_payload() {
        let mut intent = SignedAgentIntent::issue(input(), "test-secret").unwrap();
        intent.payload.amount += 1;

        assert!(matches!(
            intent.verify("test-secret"),
            Err(AppError::Unauthorized)
        ));
    }

    #[test]
    fn signed_intent_rejects_expired_payload() {
        let mut input = input();
        input.ttl = Some(Duration::seconds(-1));

        assert!(matches!(
            SignedAgentIntent::issue(input, "test-secret"),
            Err(AppError::Validation(_))
        ));
    }
}
