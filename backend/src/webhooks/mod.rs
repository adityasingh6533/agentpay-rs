pub mod razorpay;

#[cfg(test)]
mod tests {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;

    use super::razorpay::verify_webhook_signature;

    type HmacSha256 = Hmac<Sha256>;

    #[test]
    fn valid_webhook_signature_is_accepted() {
        let secret = "test_webhook_secret";
        let body = br#"{"event":"payment.captured"}"#;

        let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();

        mac.update(body);

        let signature = hex::encode(mac.finalize().into_bytes());

        assert!(verify_webhook_signature(secret, body, &signature));
    }

    #[test]
    fn invalid_webhook_signature_is_rejected() {
        let secret = "test_webhook_secret";
        let body = br#"{"event":"payment.captured"}"#;

        let invalid_signature = "0000000000000000000000000000000000000000000000000000000000000000";

        assert!(!verify_webhook_signature(secret, body, invalid_signature));
    }

    #[test]
    fn modified_body_invalidates_signature() {
        let secret = "test_webhook_secret";

        let original_body = br#"{"event":"payment.captured","amount":100}"#;

        let modified_body = br#"{"event":"payment.captured","amount":999999}"#;

        let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();

        mac.update(original_body);

        let signature = hex::encode(mac.finalize().into_bytes());

        assert!(!verify_webhook_signature(secret, modified_body, &signature));
    }

    #[test]
    fn malformed_hex_signature_is_rejected() {
        let secret = "test_webhook_secret";
        let body = br#"{"event":"payment.captured"}"#;

        assert!(!verify_webhook_signature(secret, body, "not-valid-hex"));
    }

    #[test]
    fn empty_signature_is_rejected() {
        let secret = "test_webhook_secret";
        let body = br#"{"event":"payment.captured"}"#;

        assert!(!verify_webhook_signature(secret, body, ""));
    }
}
