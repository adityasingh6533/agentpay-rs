use axum::{
    Json,
    extract::{Query, State},
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{AppState, errors::AppError};

#[derive(Debug, Deserialize)]
pub struct TransactionQuery {
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct DashboardResponse {
    pub summary: DashboardSummaryResponse,
    pub recent_transactions: Vec<TransactionResponse>,
    pub top_products: Vec<TopProductResponse>,
    pub growth: GrowthResponse,
}

#[derive(Debug, Serialize)]
pub struct DashboardSummaryResponse {
    pub captured_revenue: i64,
    pub pipeline_revenue: i64,
    pub agent_revenue: i64,
    pub total_checkouts: i64,
    pub paid_checkouts: i64,
    pub failed_checkouts: i64,
    pub agent_checkouts: i64,
    pub cross_sell_revenue: i64,
    pub audit_events: i64,
    pub success_rate: f64,
}

#[derive(Debug, Serialize)]
pub struct GrowthResponse {
    pub aov_before: i64,
    pub aov_after: i64,
    pub aov_uplift_percent: f64,
    pub cross_sell_attach_rate: f64,
}

#[derive(Debug, Serialize)]
pub struct TransactionResponse {
    pub id: Uuid,
    pub customer_name: String,
    pub product_summary: String,
    pub amount: i64,
    pub currency: String,
    pub status: String,
    pub razorpay_order_id: Option<String>,
    pub agent_influenced: bool,
    pub agent_action: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct TopProductResponse {
    pub id: Uuid,
    pub name: String,
    pub category: String,
    pub revenue: i64,
    pub orders: i64,
    pub rating: Option<f64>,
    pub stock: i64,
    pub growth_signal: String,
}

pub async fn dashboard(State(state): State<AppState>) -> Result<Json<DashboardResponse>, AppError> {
    let summary = crate::db::queries::get_dashboard_summary(&state.db).await?;
    let recent_transactions = crate::db::queries::get_recent_transactions(&state.db, 8).await?;
    let top_products = crate::db::queries::get_top_product_metrics(&state.db, 5).await?;

    let success_base = summary.paid_checkouts + summary.failed_checkouts;
    let success_rate = if success_base > 0 {
        summary.paid_checkouts as f64 / success_base as f64 * 100.0
    } else {
        100.0
    };

    let aov_after = if summary.agent_checkouts > 0 {
        summary.agent_revenue / summary.agent_checkouts
    } else {
        0
    };
    let aov_before = if summary.agent_checkouts > 0 {
        (summary.agent_revenue - summary.cross_sell_revenue).max(0) / summary.agent_checkouts
    } else {
        0
    };
    let aov_uplift_percent = if aov_before > 0 {
        (aov_after - aov_before) as f64 / aov_before as f64 * 100.0
    } else {
        0.0
    };
    let cross_sell_attach_rate = if summary.agent_checkouts > 0 {
        summary.cross_sell_revenue as f64 / summary.agent_revenue.max(1) as f64 * 100.0
    } else {
        0.0
    };

    Ok(Json(DashboardResponse {
        summary: DashboardSummaryResponse {
            captured_revenue: summary.captured_revenue,
            pipeline_revenue: summary.pipeline_revenue,
            agent_revenue: summary.agent_revenue,
            total_checkouts: summary.total_checkouts,
            paid_checkouts: summary.paid_checkouts,
            failed_checkouts: summary.failed_checkouts,
            agent_checkouts: summary.agent_checkouts,
            cross_sell_revenue: summary.cross_sell_revenue,
            audit_events: summary.audit_events,
            success_rate,
        },
        recent_transactions: recent_transactions
            .into_iter()
            .map(|transaction| TransactionResponse {
                id: transaction.id,
                customer_name: transaction.customer_name,
                product_summary: transaction
                    .product_summary
                    .unwrap_or_else(|| "Checkout".to_string()),
                amount: transaction.amount,
                currency: transaction.currency,
                status: transaction.status,
                razorpay_order_id: transaction.razorpay_order_id,
                agent_influenced: transaction.agent_influenced,
                agent_action: transaction.agent_action,
                created_at: transaction.created_at,
            })
            .collect(),
        top_products: top_products
            .into_iter()
            .map(|product| TopProductResponse {
                id: product.id,
                name: product.name,
                category: product.category,
                revenue: product.revenue,
                orders: product.orders,
                rating: product.rating,
                stock: product.stock,
                growth_signal: product.growth_signal,
            })
            .collect(),
        growth: GrowthResponse {
            aov_before,
            aov_after,
            aov_uplift_percent,
            cross_sell_attach_rate,
        },
    }))
}

pub async fn transactions(
    State(state): State<AppState>,
    Query(query): Query<TransactionQuery>,
) -> Result<Json<Vec<TransactionResponse>>, AppError> {
    let limit = query.limit.unwrap_or(50).clamp(1, 100);
    let transactions = crate::db::queries::get_recent_transactions(&state.db, limit).await?;

    Ok(Json(
        transactions
            .into_iter()
            .map(|transaction| TransactionResponse {
                id: transaction.id,
                customer_name: transaction.customer_name,
                product_summary: transaction
                    .product_summary
                    .unwrap_or_else(|| "Checkout".to_string()),
                amount: transaction.amount,
                currency: transaction.currency,
                status: transaction.status,
                razorpay_order_id: transaction.razorpay_order_id,
                agent_influenced: transaction.agent_influenced,
                agent_action: transaction.agent_action,
                created_at: transaction.created_at,
            })
            .collect(),
    ))
}
