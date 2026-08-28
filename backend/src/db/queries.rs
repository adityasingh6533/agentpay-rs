use sqlx::PgPool;
use uuid::Uuid;

use crate::agent::state::AgentSession;
use crate::models::{
    AuditEvent, CreateCustomer, Customer, Product, ProductRelationship, SpendingPolicy,
};

pub async fn create_customer(
    pool: &PgPool,
    input: CreateCustomer,
) -> Result<Customer, sqlx::Error> {
    sqlx::query_as::<_, Customer>(
        r#"
        INSERT INTO customers (
            name,
            email
        )
        VALUES ($1, $2)
        RETURNING
            id,
            name,
            email,
            created_at,
            updated_at
        "#,
    )
    .bind(input.name)
    .bind(input.email)
    .fetch_one(pool)
    .await
}

pub async fn get_customer(
    pool: &PgPool,
    customer_id: Uuid,
) -> Result<Option<Customer>, sqlx::Error> {
    sqlx::query_as::<_, Customer>(
        r#"
        SELECT
            id,
            name,
            email,
            created_at,
            updated_at
        FROM customers
        WHERE id = $1
        "#,
    )
    .bind(customer_id)
    .fetch_optional(pool)
    .await
}

pub async fn get_product(pool: &PgPool, product_id: Uuid) -> Result<Option<Product>, sqlx::Error> {
    sqlx::query_as::<_, Product>(
        r#"
        SELECT
            id,
            name,
            description,
            category,
            price,
            currency,
            stock,
            rating::FLOAT8 AS rating,
            review_count,
            active,
            metadata,
            created_at,
            updated_at
        FROM products
        WHERE id = $1
        "#,
    )
    .bind(product_id)
    .fetch_optional(pool)
    .await
}

pub async fn search_products(
    pool: &PgPool,
    category: Option<&str>,
    max_price: Option<i64>,
    limit: i64,
) -> Result<Vec<Product>, sqlx::Error> {
    sqlx::query_as::<_, Product>(
        r#"
        SELECT
            id,
            name,
            description,
            category,
            price,
            currency,
            stock,
            rating::FLOAT8 AS rating,
            review_count,
            active,
            metadata,
            created_at,
            updated_at
        FROM products
        WHERE active = TRUE
          AND stock > 0
          AND ($1::TEXT IS NULL OR category = $1)
          AND ($2::BIGINT IS NULL OR price <= $2)
        ORDER BY
            rating DESC NULLS LAST,
            review_count DESC
        LIMIT $3
        "#,
    )
    .bind(category)
    .bind(max_price)
    .bind(limit)
    .fetch_all(pool)
    .await
}

pub async fn get_audit_events(
    pool: &PgPool,
    session_id: Uuid,
) -> Result<Vec<AuditEvent>, sqlx::Error> {
    sqlx::query_as::<_, AuditEvent>(
        r#"
        SELECT
            id,
            session_id,
            event_type,
            actor::TEXT,
            status,
            message,
            metadata,
            created_at
        FROM audit_events
        WHERE session_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(session_id)
    .fetch_all(pool)
    .await
}

pub async fn create_agent_session(
    pool: &PgPool,
    customer_id: Uuid,
) -> Result<AgentSession, sqlx::Error> {
    sqlx::query_as::<_, AgentSession>(
        r#"
        INSERT INTO agent_sessions (
            customer_id,
            status
        )
        VALUES ($1, 'IDLE')
        RETURNING
            id,
            customer_id,
            status::TEXT,
            created_at,
            updated_at
        "#,
    )
    .bind(customer_id)
    .fetch_one(pool)
    .await
}
pub async fn create_customer_session(
    pool: &PgPool,
    customer: CreateCustomer,
) -> Result<(crate::models::Customer, AgentSession), sqlx::Error> {
    let mut tx = pool.begin().await?;

    let created_customer = sqlx::query_as::<_, crate::models::Customer>(
        r#"
            INSERT INTO customers (
                name,
                email
            )
            VALUES ($1, $2)
            ON CONFLICT (email)
            DO UPDATE SET
                name = EXCLUDED.name,
                updated_at = NOW()
            RETURNING
                id,
                name,
                email,
                created_at,
                updated_at
            "#,
    )
    .bind(&customer.name)
    .bind(&customer.email)
    .fetch_one(&mut *tx)
    .await?;

    let session = sqlx::query_as::<_, AgentSession>(
        r#"
            INSERT INTO agent_sessions (
                customer_id,
                status
            )
            VALUES ($1, 'IDLE')
            RETURNING
                id,
                customer_id,
                status::TEXT,
                created_at,
                updated_at
            "#,
    )
    .bind(created_customer.id)
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO audit_events (
            session_id,
            event_type,
            actor,
            status,
            message
        )
        VALUES (
            $1,
            'SESSION_CREATED',
            'SYSTEM',
            'SUCCESS',
            'Agent session created'
        )
        "#,
    )
    .bind(session.id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok((created_customer, session))
}

pub async fn get_cross_sell_products(
    pool: &PgPool,
    product_id: Uuid,
    limit: i64,
) -> Result<Vec<ProductRelationship>, sqlx::Error> {
    sqlx::query_as::<_, ProductRelationship>(
        r#"
        SELECT
            id,
            product_id,
            related_product_id,
            relationship_type,
            confidence::FLOAT8 AS confidence,
            support_count,
            created_at,
            updated_at
        FROM product_relationships
        WHERE product_id = $1
          AND relationship_type = 'CROSS_SELL'
        ORDER BY confidence DESC, support_count DESC
        LIMIT $2
        "#,
    )
    .bind(product_id)
    .bind(limit)
    .fetch_all(pool)
    .await
}

pub async fn get_products_by_ids(pool: &PgPool, ids: &[Uuid]) -> Result<Vec<Product>, sqlx::Error> {
    sqlx::query_as::<_, Product>(
        r#"
        SELECT
            id,
            name,
            description,
            category,
            price,
            currency,
            stock,
            rating::FLOAT8 AS rating,
            review_count,
            active,
            metadata,
            created_at,
            updated_at
        FROM products
        WHERE id = ANY($1)
          AND active = TRUE
          AND stock > 0
        "#,
    )
    .bind(ids)
    .fetch_all(pool)
    .await
}

pub async fn create_agent_decision(
    pool: &PgPool,
    session_id: Uuid,
    intent_id: Option<Uuid>,
    decision_type: &str,
    reasoning: &str,
    confidence: f64,
    recommendation: serde_json::Value,
    cart_id: Option<Uuid>,
    requires_confirmation: bool,
) -> Result<Uuid, sqlx::Error> {
    let id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO agent_decisions (
            session_id,
            intent_id,
            decision_type,
            reasoning,
            confidence,
            recommendation,
            cart_id,
            requires_confirmation
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
        )
        RETURNING id
        "#,
    )
    .bind(session_id)
    .bind(intent_id)
    .bind(decision_type)
    .bind(reasoning)
    .bind(confidence)
    .bind(recommendation)
    .bind(cart_id)
    .bind(requires_confirmation)
    .fetch_one(pool)
    .await?;

    Ok(id)
}

pub async fn create_audit_event(
    pool: &PgPool,
    session_id: Uuid,
    event_type: &str,
    actor: &str,
    status: &str,
    message: &str,
    metadata: serde_json::Value,
) -> Result<Uuid, sqlx::Error> {
    let id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO audit_events (
            session_id,
            event_type,
            actor,
            status,
            message,
            metadata
        )
        VALUES (
            $1,
            $2,
            $3::audit_actor,
            $4,
            $5,
            $6
        )
        RETURNING id
        "#,
    )
    .bind(session_id)
    .bind(event_type)
    .bind(actor)
    .bind(status)
    .bind(message)
    .bind(metadata)
    .fetch_one(pool)
    .await?;

    Ok(id)
}

pub async fn get_active_spending_policy(
    pool: &PgPool,
    merchant_id: Uuid,
) -> Result<Option<SpendingPolicy>, sqlx::Error> {
    sqlx::query_as::<_, SpendingPolicy>(
        r#"
        SELECT
            id,
            merchant_id,
            max_transaction_amount,
            daily_transaction_limit,
            requires_confirmation_above,
            allowed_categories,
            currency,
            active,
            created_at,
            updated_at
        FROM spending_policies
        WHERE merchant_id = $1
          AND active = TRUE
        ORDER BY created_at DESC
        LIMIT 1
        "#,
    )
    .bind(merchant_id)
    .fetch_optional(pool)
    .await
}

pub async fn get_today_spending(pool: &PgPool, customer_id: Uuid) -> Result<i64, sqlx::Error> {
    sqlx::query_scalar::<_, Option<i64>>(
        r#"
        SELECT COALESCE(SUM(amount), 0)
        FROM checkouts
        WHERE customer_id = $1
          AND status = 'PAID'
          AND created_at >= date_trunc('day', NOW())
        "#,
    )
    .bind(customer_id)
    .fetch_one(pool)
    .await
    .map(|amount| amount.unwrap_or(0))
}

use crate::agent::signed_intent::SignedAgentIntent;

pub async fn save_signed_agent_intent(
    pool: &PgPool,
    intent: &SignedAgentIntent,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO signed_agent_intents (
            id,
            session_id,
            action,
            amount,
            currency,
            category,
            product_ids,
            requires_confirmation,
            nonce,
            issued_at,
            expires_at,
            signature,
            status
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            'ISSUED'
        )
        "#,
    )
    .bind(intent.payload.intent_id)
    .bind(intent.payload.session_id)
    .bind(&intent.payload.action)
    .bind(intent.payload.amount)
    .bind(&intent.payload.currency)
    .bind(&intent.payload.category)
    .bind(&intent.payload.product_ids)
    .bind(intent.payload.requires_confirmation)
    .bind(intent.payload.nonce)
    .bind(intent.payload.issued_at)
    .bind(intent.payload.expires_at)
    .bind(&intent.signature)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn record_authorization_attempt(
    pool: &PgPool,
    intent_id: Uuid,
    nonce: Uuid,
    decision: &str,
    reason: &str,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        r#"
        INSERT INTO authorization_attempts (
            id,
            intent_id,
            nonce,
            decision,
            reason,
            authorized_at
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            CASE
                WHEN $4 = 'AUTHORIZED'
                THEN NOW()
                ELSE NULL
            END
        )
        ON CONFLICT DO NOTHING
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(intent_id)
    .bind(nonce)
    .bind(decision)
    .bind(reason)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() == 1)
}

pub async fn get_signed_agent_intent(
    pool: &PgPool,
    intent_id: Uuid,
) -> Result<Option<crate::models::SignedAgentIntentRecord>, sqlx::Error> {
    sqlx::query_as::<_, crate::models::SignedAgentIntentRecord>(
        r#"
        SELECT
            id,
            session_id,
            action,
            amount,
            currency,
            category,
            product_ids,
            requires_confirmation,
            nonce,
            issued_at,
            expires_at,
            signature,
            status,
            created_at
        FROM signed_agent_intents
        WHERE id = $1
        LIMIT 1
        "#,
    )
    .bind(intent_id)
    .fetch_optional(pool)
    .await
}

pub async fn update_signed_intent_status(
    pool: &PgPool,
    intent_id: Uuid,
    status: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE signed_agent_intents
        SET status = $2
        WHERE id = $1
        "#,
    )
    .bind(intent_id)
    .bind(status)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn consume_signed_intent(pool: &PgPool, intent_id: Uuid) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        r#"
        UPDATE signed_agent_intents
        SET status = 'CONSUMED'
        WHERE id = $1
          AND status IN ('AUTHORIZED', 'REVIEW')
          AND expires_at > NOW()
        "#,
    )
    .bind(intent_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() == 1)
}

pub async fn authorize_confirmed_intent(
    pool: &PgPool,
    intent_id: Uuid,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        r#"
        UPDATE signed_agent_intents
        SET status = 'AUTHORIZED'
        WHERE id = $1
          AND status = 'REVIEW'
          AND expires_at > NOW()
        "#,
    )
    .bind(intent_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() == 1)
}

#[derive(Debug, sqlx::FromRow)]
pub struct AgentCatalogProduct {
    pub id: uuid::Uuid,
    pub name: String,
    pub category: String,
    pub price: i64,
    pub stock: i32,
    pub rating: Option<f64>,
    pub reviews: Option<i32>,
    pub cross_sell_score: Option<f64>,
    pub conversion_rate: Option<f64>,
    pub recommendation_priority: Option<String>,
}

pub async fn get_agent_catalog_products(
    pool: &PgPool,
    category: Option<&str>,
    search: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Vec<AgentCatalogProduct>, sqlx::Error> {
    sqlx::query_as::<_, AgentCatalogProduct>(
        r#"
        SELECT
            p.id,
            p.name,
            p.category,
            p.price,
            p.stock,
            p.rating,
            p.reviews,
            p.cross_sell_score,
            p.conversion_rate,
            p.recommendation_priority
        FROM products p
        WHERE
            ($1::text IS NULL OR p.category = $1)
            AND
            (
                $2::text IS NULL
                OR p.name ILIKE '%' || $2 || '%'
            )
        ORDER BY
            CASE
                WHEN p.stock > 0 THEN 0
                ELSE 1
            END,
            p.conversion_rate DESC NULLS LAST
        LIMIT $3
        OFFSET $4
        "#,
    )
    .bind(category)
    .bind(search)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
}

#[derive(Debug, sqlx::FromRow)]
pub struct CheckoutProduct {
    pub id: uuid::Uuid,
    pub price: i64,
    pub stock: i32,
    pub category: String,
}

pub async fn get_checkout_products(
    pool: &PgPool,
    product_ids: &[uuid::Uuid],
) -> Result<Vec<CheckoutProduct>, sqlx::Error> {
    sqlx::query_as::<_, CheckoutProduct>(
        r#"
        SELECT
            id,
            price,
            stock,
            category
        FROM products
        WHERE id = ANY($1)
        "#,
    )
    .bind(product_ids)
    .fetch_all(pool)
    .await
}
