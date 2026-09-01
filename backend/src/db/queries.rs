use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::{
    agent::{signed_intent::SignedAgentIntent, state::AgentSession},
    models::{
        CreateCustomer, Customer, Product, ProductRelationship, SignedAgentIntentRecord,
        SpendingPolicy,
    },
};

#[derive(Debug, sqlx::FromRow)]
pub struct AgentCatalogProduct {
    pub id: Uuid,
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

#[derive(Debug)]
pub struct WebhookEventInsert {
    pub event_id: String,
    pub event_type: String,
    pub razorpay_order_id: Option<String>,
    pub razorpay_payment_id: Option<String>,
    pub payload: Value,
}

pub async fn create_customer_session(
    pool: &PgPool,
    customer: CreateCustomer,
) -> Result<(Customer, AgentSession), sqlx::Error> {
    let customer = sqlx::query_as::<_, Customer>(
        r#"
        INSERT INTO customers (name, email)
        VALUES ($1, $2)
        ON CONFLICT (email)
        DO UPDATE SET
            name = EXCLUDED.name,
            updated_at = NOW()
        RETURNING id, name, email, created_at, updated_at
        "#,
    )
    .bind(customer.name.trim())
    .bind(customer.email.as_deref().map(str::trim))
    .fetch_one(pool)
    .await?;

    let session = sqlx::query_as::<_, AgentSession>(
        r#"
        INSERT INTO agent_sessions (customer_id, status)
        VALUES ($1, 'IDLE'::agent_session_status)
        RETURNING id, customer_id, status::text AS status, created_at, updated_at
        "#,
    )
    .bind(customer.id)
    .fetch_one(pool)
    .await?;

    Ok((customer, session))
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
            currency::text AS currency,
            stock,
            rating::float8 AS rating,
            review_count,
            active,
            metadata,
            created_at,
            updated_at
        FROM products
        WHERE active = TRUE
          AND stock > 0
          AND ($1::text IS NULL OR category ILIKE $1)
          AND ($2::bigint IS NULL OR price <= $2)
        ORDER BY rating DESC NULLS LAST, review_count DESC, price ASC
        LIMIT $3
        "#,
    )
    .bind(category)
    .bind(max_price)
    .bind(limit)
    .fetch_all(pool)
    .await
}

pub async fn get_checkout_products(
    pool: &PgPool,
    product_ids: &[Uuid],
) -> Result<Vec<Product>, sqlx::Error> {
    sqlx::query_as::<_, Product>(
        r#"
        SELECT
            id,
            name,
            description,
            category,
            price,
            currency::text AS currency,
            stock,
            rating::float8 AS rating,
            review_count,
            active,
            metadata,
            created_at,
            updated_at
        FROM products
        WHERE id = ANY($1)
        "#,
    )
    .bind(product_ids)
    .fetch_all(pool)
    .await
}

pub async fn get_products_by_ids(
    pool: &PgPool,
    product_ids: &[Uuid],
) -> Result<Vec<Product>, sqlx::Error> {
    get_checkout_products(pool, product_ids).await
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
            confidence::float8 AS confidence,
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

pub async fn get_agent_catalog_products(
    pool: &PgPool,
    category: Option<&str>,
    query: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Vec<AgentCatalogProduct>, sqlx::Error> {
    let search = query.map(|value| format!("%{}%", value.trim()));

    sqlx::query_as::<_, AgentCatalogProduct>(
        r#"
        SELECT
            p.id,
            p.name,
            p.category,
            p.price,
            p.stock::int4 AS stock,
            p.rating::float8 AS rating,
            p.review_count::int4 AS reviews,
            rel.cross_sell_score,
            NULL::float8 AS conversion_rate,
            CASE
                WHEN p.stock > 0 AND COALESCE(p.rating, 0) >= 4.7 THEN 'HIGH'
                WHEN p.stock > 0 THEN 'NORMAL'
                ELSE 'LOW'
            END AS recommendation_priority
        FROM products p
        LEFT JOIN LATERAL (
            SELECT MAX(confidence)::float8 AS cross_sell_score
            FROM product_relationships pr
            WHERE pr.product_id = p.id
              AND pr.relationship_type = 'CROSS_SELL'
        ) rel ON TRUE
        WHERE p.active = TRUE
          AND ($1::text IS NULL OR p.category ILIKE $1)
          AND (
              $2::text IS NULL
              OR p.name ILIKE $2
              OR p.description ILIKE $2
              OR p.category ILIKE $2
          )
        ORDER BY p.rating DESC NULLS LAST, p.review_count DESC, p.name ASC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(category)
    .bind(search)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
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
            currency::text AS currency,
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
    let row = sqlx::query(
        r#"
        SELECT COALESCE(SUM(amount), 0)::bigint AS total
        FROM checkouts
        WHERE customer_id = $1
          AND status = 'PAID'::checkout_status
          AND created_at >= date_trunc('day', NOW())
        "#,
    )
    .bind(customer_id)
    .fetch_one(pool)
    .await?;

    Ok(row.get("total"))
}

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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ISSUED')
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

pub async fn get_signed_agent_intent(
    pool: &PgPool,
    intent_id: Uuid,
) -> Result<Option<SignedAgentIntentRecord>, sqlx::Error> {
    sqlx::query_as::<_, SignedAgentIntentRecord>(
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
        "#,
    )
    .bind(intent_id)
    .fetch_optional(pool)
    .await
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
            CASE WHEN $4 = 'AUTHORIZED' THEN NOW() ELSE NULL END
        )
        ON CONFLICT (intent_id) DO NOTHING
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

pub async fn update_signed_intent_status(
    pool: &PgPool,
    intent_id: Uuid,
    decision: &str,
) -> Result<(), sqlx::Error> {
    let status = match decision {
        "AUTHORIZED" => "AUTHORIZED",
        "REVIEW" => "REVIEW",
        "BLOCKED" => "BLOCKED",
        other => other,
    };

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

pub async fn claim_signed_intent(pool: &PgPool, intent_id: Uuid) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        r#"
        UPDATE signed_agent_intents
        SET status = 'PROCESSING'
        WHERE id = $1
          AND status = 'AUTHORIZED'
          AND expires_at > NOW()
        "#,
    )
    .bind(intent_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() == 1)
}

pub async fn release_signed_intent(pool: &PgPool, intent_id: Uuid) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        r#"
        UPDATE signed_agent_intents
        SET status = 'AUTHORIZED'
        WHERE id = $1
          AND status = 'PROCESSING'
          AND expires_at > NOW()
        "#,
    )
    .bind(intent_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() == 1)
}

pub async fn create_checkout_for_intent(
    pool: &PgPool,
    intent: &SignedAgentIntent,
    razorpay_order_id: &str,
) -> Result<Uuid, sqlx::Error> {
    let mut tx = pool.begin().await?;

    let customer_id: Uuid = sqlx::query_scalar(
        r#"
        SELECT customer_id
        FROM agent_sessions
        WHERE id = $1
        "#,
    )
    .bind(intent.payload.session_id)
    .fetch_one(&mut *tx)
    .await?;

    let cart_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO carts (
            session_id,
            status,
            subtotal,
            discount,
            delivery_fee,
            total,
            currency
        )
        VALUES (
            $1,
            'CHECKOUT'::cart_status,
            $2,
            0,
            0,
            $2,
            $3
        )
        RETURNING id
        "#,
    )
    .bind(intent.payload.session_id)
    .bind(intent.payload.amount)
    .bind(&intent.payload.currency)
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO cart_items (
            cart_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total_price
        )
        SELECT
            $1,
            p.id,
            p.name,
            1,
            p.price,
            p.price
        FROM products p
        WHERE p.id = ANY($2)
        "#,
    )
    .bind(cart_id)
    .bind(&intent.payload.product_ids)
    .execute(&mut *tx)
    .await?;

    let checkout_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO checkouts (
            session_id,
            customer_id,
            cart_id,
            amount,
            currency,
            status,
            razorpay_order_id,
            agent_intent_id
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            'PENDING'::checkout_status,
            $6,
            $7
        )
        ON CONFLICT (agent_intent_id) WHERE agent_intent_id IS NOT NULL
        DO UPDATE SET
            razorpay_order_id = EXCLUDED.razorpay_order_id,
            status = 'PENDING'::checkout_status,
            updated_at = NOW()
        RETURNING id
        "#,
    )
    .bind(intent.payload.session_id)
    .bind(customer_id)
    .bind(cart_id)
    .bind(intent.payload.amount)
    .bind(&intent.payload.currency)
    .bind(razorpay_order_id)
    .bind(intent.payload.intent_id)
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(checkout_id)
}

pub async fn reserve_inventory(
    pool: &PgPool,
    intent_id: Uuid,
    product_ids: &[Uuid],
    expires_at: DateTime<Utc>,
) -> Result<bool, sqlx::Error> {
    let mut tx = pool.begin().await?;

    let unique_product_count = product_ids
        .iter()
        .copied()
        .collect::<std::collections::HashSet<_>>()
        .len();

    let locked_products = sqlx::query_scalar::<_, Uuid>(
        r#"
        WITH requested AS (
            SELECT DISTINCT unnest($1::uuid[]) AS product_id
        )
        SELECT p.id
        FROM products p
        JOIN requested r ON r.product_id = p.id
        WHERE p.active = TRUE
        ORDER BY p.id
        FOR UPDATE OF p
        "#,
    )
    .bind(product_ids)
    .fetch_all(&mut *tx)
    .await?;

    if locked_products.len() != unique_product_count {
        return Ok(false);
    }

    let result = sqlx::query(
        r#"
        WITH requested AS (
            SELECT DISTINCT unnest($2::uuid[]) AS product_id
        ),
        available AS (
            SELECT p.id AS product_id
            FROM products p
            JOIN requested r ON r.product_id = p.id
            WHERE p.stock > (
                SELECT COALESCE(SUM(ir.quantity), 0)::bigint
                FROM inventory_reservations ir
                WHERE ir.product_id = p.id
                  AND ir.status = 'RESERVED'::inventory_reservation_status
                  AND ir.expires_at > NOW()
            )
        )
        INSERT INTO inventory_reservations (
            intent_id,
            product_id,
            quantity,
            status,
            expires_at
        )
        SELECT
            $1,
            product_id,
            1,
            'RESERVED'::inventory_reservation_status,
            $3
        FROM available
        ON CONFLICT (intent_id, product_id) DO NOTHING
        "#,
    )
    .bind(intent_id)
    .bind(product_ids)
    .bind(expires_at)
    .execute(&mut *tx)
    .await?;

    let reserved_all = result.rows_affected() as usize == unique_product_count;

    if reserved_all {
        tx.commit().await?;
    }

    Ok(reserved_all)
}

pub async fn release_inventory(pool: &PgPool, intent_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE inventory_reservations
        SET
            status = 'RELEASED'::inventory_reservation_status,
            updated_at = NOW()
        WHERE intent_id = $1
          AND status = 'RESERVED'::inventory_reservation_status
        "#,
    )
    .bind(intent_id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn create_agent_decision(
    pool: &PgPool,
    session_id: Uuid,
    intent_id: Option<Uuid>,
    decision_type: &str,
    reasoning: &str,
    confidence: f64,
    recommendation: Value,
    cart_id: Option<Uuid>,
    requires_confirmation: bool,
) -> Result<Uuid, sqlx::Error> {
    sqlx::query_scalar(
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
    .await
}

pub async fn create_audit_event(
    pool: &PgPool,
    session_id: Uuid,
    event_type: &str,
    actor: &str,
    status: &str,
    message: &str,
    metadata: Value,
) -> Result<Uuid, sqlx::Error> {
    sqlx::query_scalar(
        r#"
        INSERT INTO audit_events (
            session_id,
            event_type,
            actor,
            status,
            message,
            metadata
        )
        VALUES ($1, $2, $3::audit_actor, $4, $5, $6)
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
    .await
}

pub async fn get_audit_events(
    pool: &PgPool,
    session_id: Uuid,
) -> Result<Vec<crate::models::AuditEvent>, sqlx::Error> {
    sqlx::query_as::<_, crate::models::AuditEvent>(
        r#"
        SELECT
            id,
            session_id,
            event_type,
            actor::text AS actor,
            status,
            message,
            metadata,
            created_at
        FROM audit_events
        WHERE session_id = $1
        ORDER BY created_at ASC
        "#,
    )
    .bind(session_id)
    .fetch_all(pool)
    .await
}

pub async fn insert_webhook_event(
    pool: &PgPool,
    event: &WebhookEventInsert,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        r#"
        INSERT INTO webhook_events (
            provider,
            event_id,
            event_type,
            razorpay_order_id,
            razorpay_payment_id,
            payload
        )
        VALUES ('razorpay', $1, $2, $3, $4, $5)
        ON CONFLICT (provider, event_id) DO NOTHING
        "#,
    )
    .bind(&event.event_id)
    .bind(&event.event_type)
    .bind(&event.razorpay_order_id)
    .bind(&event.razorpay_payment_id)
    .bind(&event.payload)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() == 1)
}

pub async fn mark_webhook_processed(pool: &PgPool, event_id: &str) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE webhook_events
        SET
            status = 'PROCESSED',
            processed_at = NOW()
        WHERE provider = 'razorpay'
          AND event_id = $1
        "#,
    )
    .bind(event_id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn mark_webhook_failed(pool: &PgPool, event_id: &str) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE webhook_events
        SET
            status = 'FAILED',
            processed_at = NOW()
        WHERE provider = 'razorpay'
          AND event_id = $1
        "#,
    )
    .bind(event_id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn get_checkout_reconciliation(
    pool: &PgPool,
    razorpay_order_id: &str,
) -> Result<Option<(Uuid, Uuid)>, sqlx::Error> {
    sqlx::query_as(
        r#"
        SELECT session_id, agent_intent_id
        FROM checkouts
        WHERE razorpay_order_id = $1
          AND agent_intent_id IS NOT NULL
        "#,
    )
    .bind(razorpay_order_id)
    .fetch_optional(pool)
    .await
}

pub async fn reconcile_successful_payment(
    pool: &PgPool,
    razorpay_order_id: &str,
    intent_id: Uuid,
) -> Result<Uuid, sqlx::Error> {
    let mut tx = pool.begin().await?;

    // Lock the checkout row so two webhook workers cannot
    // reconcile the same payment simultaneously.
    let checkout = sqlx::query_as::<_, (Uuid, Option<Uuid>, String)>(
        r#"
        SELECT
            session_id,
            agent_intent_id,
            status::text AS status
        FROM checkouts
        WHERE razorpay_order_id = $1
        FOR UPDATE
        "#,
    )
    .bind(razorpay_order_id)
    .fetch_optional(&mut *tx)
    .await?;

    let Some((session_id, checkout_intent_id, status)) = checkout else {
        return Err(sqlx::Error::RowNotFound);
    };

    if checkout_intent_id != Some(intent_id) {
        return Err(sqlx::Error::Protocol(
            "Checkout does not belong to supplied agent intent".to_string(),
        ));
    }

    // Idempotent success handling.
    if status == "PAID" {
        tx.commit().await?;
        return Ok(session_id);
    }

    // Only PROCESSING checkout may become PAID.
    if status != "PENDING" && status != "CREATED" {
        return Err(sqlx::Error::Protocol(
            "Checkout is not in a payable state".to_string(),
        ));
    }

    sqlx::query(
        r#"
        UPDATE checkouts
        SET
            status = 'PAID',
            updated_at = NOW()
        WHERE razorpay_order_id = $1
        "#,
    )
    .bind(razorpay_order_id)
    .execute(&mut *tx)
    .await?;

    let intent_result = sqlx::query(
        r#"
        UPDATE signed_agent_intents
        SET
            status = 'CONSUMED'
        WHERE id = $1
          AND status = 'PROCESSING'
        "#,
    )
    .bind(intent_id)
    .execute(&mut *tx)
    .await?;

    if intent_result.rows_affected() != 1 {
        return Err(sqlx::Error::Protocol(
            "Agent intent is not in PROCESSING state".to_string(),
        ));
    }

    // RESERVED -> COMPLETED.
    //
    // Stock was not deducted during reservation.
    // It is deducted here, after confirmed payment.
    let reservations = sqlx::query_as::<_, (Uuid, i64)>(
        r#"
        SELECT
            product_id,
            quantity
        FROM inventory_reservations
        WHERE intent_id = $1
          AND status = 'RESERVED'
        FOR UPDATE
        "#,
    )
    .bind(intent_id)
    .fetch_all(&mut *tx)
    .await?;

    for (product_id, quantity) in reservations {
        let result = sqlx::query(
            r#"
            UPDATE products
            SET
                stock = stock - $2,
                updated_at = NOW()
            WHERE id = $1
              AND stock >= $2
            "#,
        )
        .bind(product_id)
        .bind(quantity)
        .execute(&mut *tx)
        .await?;

        if result.rows_affected() != 1 {
            return Err(sqlx::Error::Protocol(
                "Insufficient inventory while finalizing payment".to_string(),
            ));
        }

        sqlx::query(
            r#"
            UPDATE inventory_reservations
            SET
                status = 'COMPLETED',
                updated_at = NOW()
            WHERE intent_id = $1
              AND product_id = $2
              AND status = 'RESERVED'
            "#,
        )
        .bind(intent_id)
        .bind(product_id)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    Ok(session_id)
}

pub async fn reconcile_failed_payment(
    pool: &PgPool,
    razorpay_order_id: &str,
    intent_id: Uuid,
) -> Result<Uuid, sqlx::Error> {
    let mut tx = pool.begin().await?;

    let checkout = sqlx::query_as::<_, (Uuid, Option<Uuid>, String)>(
        r#"
        SELECT
            session_id,
            agent_intent_id,
            status::text AS status
        FROM checkouts
        WHERE razorpay_order_id = $1
        FOR UPDATE
        "#,
    )
    .bind(razorpay_order_id)
    .fetch_optional(&mut *tx)
    .await?;

    let Some((session_id, checkout_intent_id, status)) = checkout else {
        return Err(sqlx::Error::RowNotFound);
    };

    if checkout_intent_id != Some(intent_id) {
        return Err(sqlx::Error::Protocol(
            "Checkout does not belong to supplied agent intent".to_string(),
        ));
    }

    // Duplicate/late failed event after payment already succeeded.
    if status == "PAID" {
        tx.commit().await?;
        return Ok(session_id);
    }

    sqlx::query(
        r#"
        UPDATE checkouts
        SET
            status = 'FAILED',
            updated_at = NOW()
        WHERE razorpay_order_id = $1
        "#,
    )
    .bind(razorpay_order_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        UPDATE signed_agent_intents
        SET
            status = 'AUTHORIZED'
        WHERE id = $1
          AND status = 'PROCESSING'
        "#,
    )
    .bind(intent_id)
    .execute(&mut *tx)
    .await?;

    let reservations = sqlx::query_as::<_, (Uuid, i64)>(
        r#"
        SELECT
            product_id,
            quantity
        FROM inventory_reservations
        WHERE intent_id = $1
          AND status = 'RESERVED'
        FOR UPDATE
        "#,
    )
    .bind(intent_id)
    .fetch_all(&mut *tx)
    .await?;

    for (product_id, quantity) in reservations {
        sqlx::query(
            r#"
            UPDATE inventory_reservations
            SET
                status = 'RELEASED',
                updated_at = NOW()
            WHERE intent_id = $1
              AND product_id = $2
              AND status = 'RESERVED'
            "#,
        )
        .bind(intent_id)
        .bind(product_id)
        .execute(&mut *tx)
        .await?;

        // No stock decrement happened during reservation,
        // therefore nothing needs to be added back.
        let _ = quantity;
    }

    tx.commit().await?;

    Ok(session_id)
}

pub async fn get_agent_catalog(
    pool: &PgPool,
    _merchant_id: Uuid,
) -> Result<Vec<crate::models::AgentProduct>, sqlx::Error> {
    sqlx::query_as::<
        _,
        (
            Uuid,
            String,
            Option<String>,
            String,
            i64,
            String,
            i32,
            Option<f64>,
            i64,
        ),
    >(
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
            review_count
        FROM products
        WHERE active = TRUE
        ORDER BY
            stock > 0 DESC,
            rating DESC NULLS LAST,
            id
        "#,
    )
    .fetch_all(pool)
    .await
    .map(|rows| {
        rows.into_iter()
            .map(
                |(id, name, description, category, price, currency, stock, rating, reviews)| {
                    crate::models::AgentProduct {
                        id,
                        name,
                        description,
                        category,
                        price,
                        currency,
                        stock,
                        rating,
                        reviews,
                        available: stock > 0,
                    }
                },
            )
            .collect()
    })
}
