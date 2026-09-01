use uuid::Uuid;

use crate::{
    db::queries,
    errors::AppError,
    models::{AgentCapabilities, AgentCatalog},
};

pub async fn build_agent_catalog(
    pool: &sqlx::PgPool,
    merchant_id: Uuid,
) -> Result<AgentCatalog, AppError> {
    let products = queries::get_agent_catalog(pool, merchant_id).await?;

    let currency = products
        .first()
        .map(|product| product.currency.clone())
        .unwrap_or_else(|| "INR".to_string());

    Ok(AgentCatalog {
        version: "1.0".to_string(),
        merchant_id,
        currency,
        products,
        capabilities: AgentCapabilities {
            search: true,
            recommendations: true,
            cross_sell: true,
            checkout: true,
            signed_intents: true,
            customer_confirmation: true,
        },
    })
}
