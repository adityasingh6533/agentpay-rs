use chrono::{DateTime, Duration, Utc};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use uuid::Uuid;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentIntentPayload {
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignedAgentIntent {
    pub payload: AgentIntentPayload,
    pub signature: String,
}

#[derive(Serialize)]
struct CanonicalAgentIntentPayload<'a> {
    intent_id: Uuid,
    session_id: Uuid,
    action: &'a str,
    amount: i64,
    currency: &'a str,
    category: &'a str,
    product_ids: &'a [Uuid],
    requires_confirmation: bool,
    nonce: Uuid,
    issued_at_micros: i64,
    expires_at_micros: i64,
}

impl AgentIntentPayload {
    pub fn canonical_bytes(&self) -> Result<Vec<u8>, serde_json::Error> {
        let canonical =
            CanonicalAgentIntentPayload {
                intent_id: self.intent_id,
                session_id: self.session_id,
                action: &self.action,
                amount: self.amount,
                currency: &self.currency,
                category: &self.category,
                product_ids: &self.product_ids,
                requires_confirmation:
                    self.requires_confirmation,
                nonce: self.nonce,
                issued_at_micros:
                    self.issued_at.timestamp_micros(),
                expires_at_micros:
                    self.expires_at.timestamp_micros(),
            };

        serde_json::to_vec(&canonical)
    }
}

pub fn create_signed_intent(
    secret: &str,
    session_id: Uuid,
    action: impl Into<String>,
    amount: i64,
    currency: impl Into<String>,
    category: impl Into<String>,
    product_ids: Vec<Uuid>,
    requires_confirmation: bool,
) -> Result<SignedAgentIntent, String> {
    if secret.trim().is_empty() {
        return Err(
            "Agent signing secret cannot be empty".to_string()
        );
    }

    if amount <= 0 {
        return Err(
            "Agent intent amount must be positive".to_string()
        );
    }

    let now = Utc::now();

    let payload = AgentIntentPayload {
        intent_id: Uuid::new_v4(),
        session_id,
        action: action.into(),
        amount,
        currency: currency.into(),
        category: category.into(),
        product_ids,
        requires_confirmation,
        nonce: Uuid::new_v4(),
        issued_at: now,
        expires_at: now + Duration::minutes(5),
    };

    let signature =
        sign_payload(secret, &payload)?;

    Ok(SignedAgentIntent {
        payload,
        signature,
    })
}

pub fn verify_signed_intent(
    secret: &str,
    intent: &SignedAgentIntent,
) -> Result<(), String> {
    if secret.trim().is_empty() {
        return Err(
            "Agent signing secret cannot be empty".to_string()
        );
    }

    let now = Utc::now();

    if now >= intent.payload.expires_at {
        return Err(
            "Agent intent has expired".to_string()
        );
    }

    if intent.payload.issued_at > now + Duration::seconds(30) {
        return Err(
            "Agent intent issued_at is invalid".to_string()
        );
    }

    let expected =
        sign_payload(secret, &intent.payload)?;

    if !constant_time_equal(
        expected.as_bytes(),
        intent.signature.as_bytes(),
    ) {
        return Err(
            "Invalid agent intent signature".to_string()
        );
    }

    Ok(())
}

fn sign_payload(
    secret: &str,
    payload: &AgentIntentPayload,
) -> Result<String, String> {
    let bytes = payload
        .canonical_bytes()
        .map_err(|error| error.to_string())?;

    let mut mac =
        HmacSha256::new_from_slice(
            secret.as_bytes()
        )
        .map_err(|error| error.to_string())?;

    mac.update(&bytes);

    let result = mac.finalize();

    Ok(hex::encode(result.into_bytes()))
}

fn constant_time_equal(
    left: &[u8],
    right: &[u8],
) -> bool {
    if left.len() != right.len() {
        return false;
    }

    let mut difference = 0u8;

    for (a, b) in left.iter().zip(right.iter()) {
        difference |= a ^ b;
    }

    difference == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    const SECRET: &str =
        "test-secret-for-agentpay";

    #[test]
    fn creates_valid_signed_intent() {
        let session_id = Uuid::new_v4();

        let intent =
            create_signed_intent(
                SECRET,
                session_id,
                "CREATE_ORDER",
                1299,
                "INR",
                "Running",
                vec![Uuid::new_v4()],
                false,
            )
            .unwrap();

        assert!(
            verify_signed_intent(
                SECRET,
                &intent
            )
            .is_ok()
        );
    }

    #[test]
    fn rejects_modified_amount() {
        let session_id = Uuid::new_v4();

        let mut intent =
            create_signed_intent(
                SECRET,
                session_id,
                "CREATE_ORDER",
                1299,
                "INR",
                "Running",
                vec![Uuid::new_v4()],
                false,
            )
            .unwrap();

        intent.payload.amount = 9999;

        assert!(
            verify_signed_intent(
                SECRET,
                &intent
            )
            .is_err()
        );
    }

    #[test]
    fn rejects_wrong_secret() {
        let intent =
            create_signed_intent(
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

        assert!(
            verify_signed_intent(
                "wrong-secret",
                &intent
            )
            .is_err()
        );
    }

    #[test]
    fn verifies_after_database_timestamp_precision_roundtrip() {
        let mut intent =
            create_signed_intent(
                SECRET,
                Uuid::new_v4(),
                "CREATE_ORDER",
                1299,
                "INR",
                "Running",
                vec![Uuid::new_v4()],
                false,
            )
            .unwrap();

        intent.payload.issued_at =
            DateTime::<Utc>::from_timestamp_micros(
                intent.payload.issued_at.timestamp_micros(),
            )
            .unwrap();

        intent.payload.expires_at =
            DateTime::<Utc>::from_timestamp_micros(
                intent.payload.expires_at.timestamp_micros(),
            )
            .unwrap();

        assert!(
            verify_signed_intent(
                SECRET,
                &intent
            )
            .is_ok()
        );
    }

    #[test]
    fn rejects_expired_intent() {
        let now = Utc::now();

        let payload =
            AgentIntentPayload {
                intent_id: Uuid::new_v4(),
                session_id: Uuid::new_v4(),
                action: "CREATE_ORDER".to_string(),
                amount: 1299,
                currency: "INR".to_string(),
                category: "Running".to_string(),
                product_ids: vec![],
                requires_confirmation: false,
                nonce: Uuid::new_v4(),
                issued_at: now - Duration::minutes(10),
                expires_at: now - Duration::minutes(5),
            };

        let signature =
            sign_payload(
                SECRET,
                &payload,
            )
            .unwrap();

        let intent =
            SignedAgentIntent {
                payload,
                signature,
            };

        assert!(
            verify_signed_intent(
                SECRET,
                &intent
            )
            .is_err()
        );
    }
}
