use std::env;

#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub frontend_url: String,
    pub agent_secret: String,

    pub razorpay_key_id: String,
    pub razorpay_key_secret: String,

    pub max_transaction_amount: i64,
    pub daily_transaction_limit: i64,

    pub ai_api_key: String,
    pub ai_base_url: String,
    pub ai_model: String,
}

impl Config {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        dotenvy::dotenv().ok();

        Ok(Self {
            database_url: env::var("DATABASE_URL")?,

            frontend_url: env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "http://localhost:3000".into()),

            agent_secret: env::var("AGENT_SECRET")?,

            razorpay_key_id: env::var("RAZORPAY_KEY_ID").unwrap_or_default(),

            razorpay_key_secret: env::var("RAZORPAY_KEY_SECRET").unwrap_or_default(),

            max_transaction_amount: env::var("MAX_TRANSACTION_AMOUNT")
                .unwrap_or_else(|_| "5000".into())
                .parse()?,

            daily_transaction_limit: env::var("DAILY_TRANSACTION_LIMIT")
                .unwrap_or_else(|_| "20000".into())
                .parse()?,

            ai_api_key: env::var("AI_API_KEY")?,

            ai_base_url: env::var("AI_BASE_URL")?,

            ai_model: env::var("AI_MODEL")?,
        })
    }
}
