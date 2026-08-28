use axum::{
    Json,
    extract::{Query, State},
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{AppState, errors::AppError};

#[derive(Debug, Serialize)]
pub struct AgentCatalogResponse {
    pub protocol: CatalogProtocol,
    pub merchant: MerchantInfo,
    pub capabilities: Capabilities,
    pub checkout: CheckoutCapability,
    pub pagination: Pagination,
    pub products: Vec<AgentProduct>,
}

#[derive(Debug, Serialize)]
pub struct MerchantInfo {
    pub currency: &'static str,
}

#[derive(Debug, Serialize)]
pub struct CheckoutCapability {
    pub authorization_endpoint: &'static str,
    pub execution_endpoint: &'static str,
    pub method: &'static str,
    pub authorization_required: bool,
    pub customer_confirmation_supported: bool,
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
pub struct Pagination {
    pub limit: i64,
    pub offset: i64,
    pub returned: usize,
    pub has_more: bool,
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
    pub checkout: ProductCheckout,
}

#[derive(Debug, Serialize)]
pub struct ProductCheckout {
    pub purchasable: bool,
    pub requires_authorization: bool,
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
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub async fn get_agent_catalog(
    State(state): State<AppState>,
    Query(query): Query<CatalogQuery>,
) -> Result<Json<AgentCatalogResponse>, AppError> {
    let limit = query.limit.unwrap_or(25).clamp(1, 100);

    let offset = query.offset.unwrap_or(0).max(0);

    let products = crate::db::queries::get_agent_catalog_products(
        &state.db,
        query.category.as_deref(),
        query.q.as_deref(),
        limit + 1,
        offset,
    )
    .await?;

    let has_more = products.len() > limit as usize;

    let products = products
        .into_iter()
        .take(limit as usize)
        .map(|product| {
            let in_stock = product.stock > 0;

            AgentProduct {
                id: product.id,
                name: product.name,
                category: product.category,
                price: product.price,
                currency: "INR",
                in_stock,
                stock_quantity: product.stock,
                rating: product.rating,
                reviews: product.reviews,

                agent_signals: AgentSignals {
                    cross_sell_score: product.cross_sell_score,

                    conversion_rate: product.conversion_rate,

                    recommendation_priority: product.recommendation_priority,
                },

                checkout: ProductCheckout {
                    purchasable: in_stock,
                    requires_authorization: true,
                },
            }
        })
        .collect::<Vec<_>>();

    let returned = products.len();

    Ok(Json(AgentCatalogResponse {
        protocol: CatalogProtocol {
            name: "AgentPay Commerce Protocol",
            version: "1.0",
            purpose: "Machine-readable catalog and autonomous commerce discovery",
        },

        merchant: MerchantInfo { currency: "INR" },

        capabilities: Capabilities {
            search: true,
            recommendations: true,
            checkout: true,
            autonomous_purchase: true,
            customer_confirmation: true,
        },

        checkout: CheckoutCapability {
            authorization_endpoint: "/api/checkout/authorize",

            execution_endpoint: "/api/checkout/execute",

            method: "POST",

            authorization_required: true,

            customer_confirmation_supported: true,
        },

        pagination: Pagination {
            limit,
            offset,
            returned,
            has_more,
        },

        products,
    }))
}
