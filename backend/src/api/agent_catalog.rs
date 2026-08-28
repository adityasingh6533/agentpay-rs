use axum::{
    extract::{Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{errors::AppError, AppState};

#[derive(Debug, Serialize)]
pub struct AgentCatalogResponse {
    pub protocol: CatalogProtocol,
    pub capabilities: Capabilities,
    pub products: Vec<AgentProduct>,
}

#[derive(Debug, Serialize)]
pub struct CatalogProtocol {
    pub name: &'static str,
    pub version: &'static str,
    pub purpose: &'static str,
}

#[derive(Debug, Serialize)]
pub struct Capabilities {
    pub search: bool,
    pub recommendations: bool,
    pub checkout: bool,
    pub autonomous_purchase: bool,
    pub customer_confirmation: bool,
}

#[derive(Debug, Serialize)]
pub struct AgentProduct {
    pub id: Uuid,
    pub name: String,
    pub category: String,
    pub price: i64,
    pub currency: &'static str,
    pub in_stock: bool,
    pub stock_quantity: i32,
    pub rating: Option<f64>,
    pub reviews: Option<i32>,
    pub agent_signals: AgentSignals,
}

#[derive(Debug, Serialize)]
pub struct AgentSignals {
    pub cross_sell_score: Option<f64>,
    pub conversion_rate: Option<f64>,
    pub recommendation_priority: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CatalogQuery {
    pub category: Option<String>,
    pub q: Option<String>,
}

pub async fn get_agent_catalog(
    State(state): State<AppState>,
    Query(query): Query<CatalogQuery>,
) -> Result<Json<AgentCatalogResponse>, AppError> {
    let products =
        crate::db::queries::get_agent_catalog_products(
            &state.db,
            query.category.as_deref(),
            query.q.as_deref(),
        )
        .await?;

    let products = products
        .into_iter()
        .map(|product| AgentProduct {
            id: product.id,
            name: product.name,
            category: product.category,
            price: product.price,
            currency: "INR",
            in_stock: product.stock > 0,
            stock_quantity: product.stock,
            rating: product.rating,
            reviews: product.reviews,
            agent_signals: AgentSignals {
                cross_sell_score: product.cross_sell_score,
                conversion_rate: product.conversion_rate,
                recommendation_priority:
                    product.recommendation_priority,
            },
        })
        .collect();

    Ok(Json(AgentCatalogResponse {
        protocol: CatalogProtocol {
            name: "AgentPay Commerce Protocol",
            version: "1.0",
            purpose:
                "Machine-readable catalog and autonomous commerce discovery",
        },

        capabilities: Capabilities {
            search: true,
            recommendations: true,
            checkout: true,
            autonomous_purchase: true,
            customer_confirmation: true,
        },

        products,
    }))
}