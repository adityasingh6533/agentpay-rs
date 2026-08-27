use std::env;

use crate::errors::AppError;

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub ai_api_key: String,
    pub ai_base_url: String,
    pub ai_model: String,
    pub agent_signing_secret: String,
    pub razorpay_key_id: String,
    pub razorpay_key_secret: String,
    pub razorpay_webhook_secret: String,
}

impl Config {
    pub fn from_env() -> Result<Self, AppError> {
        dotenvy::dotenv().ok();

        Ok(Self {
            database_url: required_env("DATABASE_URL")?,
            ai_api_key: env::var("AI_API_KEY").unwrap_or_default(),
            ai_base_url: env::var("AI_BASE_URL").unwrap_or_default(),
            ai_model: env::var("AI_MODEL").unwrap_or_default(),
            agent_signing_secret: env::var("AGENT_SIGNING_SECRET").unwrap_or_default(),
            razorpay_key_id: required_env("RAZORPAY_KEY_ID")?,
            razorpay_key_secret: required_env("RAZORPAY_KEY_SECRET")?,
            razorpay_webhook_secret: required_env("RAZORPAY_WEBHOOK_SECRET")?,
        })
    }
}

fn required_env(key: &str) -> Result<String, AppError> {
    env::var(key)
        .map(|value| value.trim().to_string())
        .ok()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| AppError::Config(format!("{key} must be set")))
}
