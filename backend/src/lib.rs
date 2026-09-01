pub mod agent;
pub mod api;
pub mod config;
pub mod db;
pub mod errors;
pub mod integrations;
pub mod models;
pub mod services;
pub mod webhooks;

use std::sync::Arc;

use crate::{config::Config, integrations::razorpay::client::RazorpayClient};

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub config: Arc<Config>,
    pub razorpay: RazorpayClient,
}
