use sqlx::PgPool;

use crate::{agent::state::AgentSession, db::queries, errors::AppError, models::CreateCustomer};

pub async fn start_agent_session(
    pool: &PgPool,
    customer_name: String,
    customer_email: Option<String>,
) -> Result<AgentSession, AppError> {
    if customer_name.trim().is_empty() {
        return Err(AppError::Validation("customer name cannot be empty".into()));
    }

    if customer_name.len() > 100 {
        return Err(AppError::Validation("customer name is too long".into()));
    }

    let customer = CreateCustomer {
        name: customer_name,
        email: customer_email,
    };

    let (_, session) = queries::create_customer_session(pool, customer).await?;

    Ok(session)
}

use std::sync::Arc;

use crate::{
    agent::{decision::AgentResult, orchestrator::AgentOrchestrator},
    config::Config,
};

pub async fn process_agent_message(
    config: Arc<Config>,
    pool: &PgPool,
    message: &str,
) -> Result<AgentResult, AppError> {
    let agent = AgentOrchestrator::new(config, pool.clone());

    agent.process(message).await
}
