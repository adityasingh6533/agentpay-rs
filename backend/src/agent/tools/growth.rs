use sqlx::PgPool;
use uuid::Uuid;

use crate::{db::queries, errors::AppError, models::Product};

#[derive(Debug, Clone)]
pub struct GrowthOpportunity {
    pub source_product: Uuid,
    pub recommended_product: Product,
    pub confidence: f64,
    pub support_count: i64,
}

pub async fn find_cross_sell(
    pool: &PgPool,
    product_id: Uuid,
) -> Result<Option<GrowthOpportunity>, AppError> {
    let relationships = queries::get_cross_sell_products(pool, product_id, 5).await?;

    if relationships.is_empty() {
        return Ok(None);
    }

    let ids = relationships
        .iter()
        .map(|relationship| relationship.related_product_id)
        .collect::<Vec<_>>();

    let products = queries::get_products_by_ids(pool, &ids).await?;

    let best = relationships
        .iter()
        .filter_map(|relationship| {
            let product = products
                .iter()
                .find(|product| product.id == relationship.related_product_id)?;

            Some(GrowthOpportunity {
                source_product: product_id,
                recommended_product: product.clone(),
                confidence: relationship.confidence,
                support_count: relationship.support_count,
            })
        })
        .max_by(|a, b| {
            a.confidence
                .partial_cmp(&b.confidence)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

    Ok(best)
}
