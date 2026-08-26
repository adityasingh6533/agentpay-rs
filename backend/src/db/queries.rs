use sqlx::PgPool;
use uuid::Uuid;

use crate::agent::state::AgentSession;
use crate::models::{AuditEvent, CreateCustomer, Customer, Product, ProductRelationship};

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
            rating,
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
            rating,
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
            confidence,
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
            rating,
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
