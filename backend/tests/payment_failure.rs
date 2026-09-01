use chrono::{Duration, Utc};
use sqlx::{PgPool, postgres::PgPoolOptions};
use uuid::Uuid;

async fn test_pool() -> PgPool {
    dotenvy::dotenv().ok();

    let database_url =
        std::env::var("DATABASE_URL").expect("DATABASE_URL must be set in backend/.env");

    PgPoolOptions::new()
        .min_connections(2)
        .max_connections(20)
        .acquire_timeout(std::time::Duration::from_secs(5))
        .connect(&database_url)
        .await
        .expect("failed to connect to PostgreSQL")
}

#[tokio::test]
async fn failed_payment_releases_inventory_and_restores_intent() {
    let pool = test_pool().await;

    let customer_id = Uuid::new_v4();
    let session_id = Uuid::new_v4();
    let decision_id = Uuid::new_v4();
    let intent_id = Uuid::new_v4();
    let cart_id = Uuid::new_v4();
    let checkout_id = Uuid::new_v4();
    let product_id = Uuid::new_v4();

    let razorpay_order_id = format!("order_test_{}", Uuid::new_v4());

    let expires_at = Utc::now() + Duration::minutes(10);

    // -----------------------------------------------------
    // 1. Customer
    // -----------------------------------------------------

    sqlx::query(
        r#"
        INSERT INTO customers (
            id,
            name,
            email
        )
        VALUES (
            $1,
            'Failure Test Customer',
            $2
        )
        "#,
    )
    .bind(customer_id)
    .bind(format!("test-{}@example.com", customer_id))
    .execute(&pool)
    .await
    .expect("failed to create customer");

    // -----------------------------------------------------
    // 2. Agent session
    // -----------------------------------------------------

    sqlx::query(
        r#"
        INSERT INTO agent_sessions (
            id,
            customer_id,
            status
        )
        VALUES (
            $1,
            $2,
            'CHECKOUT'
        )
        "#,
    )
    .bind(session_id)
    .bind(customer_id)
    .execute(&pool)
    .await
    .expect("failed to create session");

    // -----------------------------------------------------
    // 3. Product
    // -----------------------------------------------------

    sqlx::query(
        r#"
        INSERT INTO products (
            id,
            name,
            description,
            category,
            price,
            currency,
            stock,
            active
        )
        VALUES (
            $1,
            'Payment Failure Test Product',
            'Temporary test product',
            'TEST',
            100,
            'INR',
            1,
            TRUE
        )
        "#,
    )
    .bind(product_id)
    .execute(&pool)
    .await
    .expect("failed to create product");

    // -----------------------------------------------------
    // 4. Cart
    // -----------------------------------------------------

    sqlx::query(
        r#"
        INSERT INTO carts (
            id,
            session_id,
            status,
            subtotal,
            total,
            currency
        )
        VALUES (
            $1,
            $2,
            'CHECKOUT',
            100,
            100,
            'INR'
        )
        "#,
    )
    .bind(cart_id)
    .bind(session_id)
    .execute(&pool)
    .await
    .expect("failed to create cart");

    // -----------------------------------------------------
    // 5. Agent decision
    // -----------------------------------------------------

    sqlx::query(
        r#"
        INSERT INTO agent_decisions (
            id,
            session_id,
            decision_type,
            reasoning,
            confidence,
            cart_id,
            requires_confirmation
        )
        VALUES (
            $1,
            $2,
            'PURCHASE',
            'Integration test decision',
            1.0,
            $3,
            FALSE
        )
        "#,
    )
    .bind(decision_id)
    .bind(session_id)
    .bind(cart_id)
    .execute(&pool)
    .await
    .expect("failed to create agent decision");

    // -----------------------------------------------------
    // 6. Signed agent intent
    // -----------------------------------------------------
    //
    // Adjust these columns only if your current
    // signed_agent_intents migration differs.

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
            'CREATE_ORDER',
            100,
            'INR',
            'TEST',
            $3,
            FALSE,
            $4,
            NOW(),
            $5,
            'test-signature',
            'PROCESSING'
        )
        "#,
    )
    .bind(intent_id)
    .bind(session_id)
    .bind(vec![product_id])
    .bind(Uuid::new_v4())
    .bind(expires_at)
    .execute(&pool)
    .await
    .expect("failed to create signed intent");

    // -----------------------------------------------------
    // 7. Inventory reservation
    // -----------------------------------------------------

    sqlx::query(
        r#"
        INSERT INTO inventory_reservations (
            intent_id,
            product_id,
            quantity,
            status,
            expires_at
        )
        VALUES (
            $1,
            $2,
            1,
            'RESERVED',
            $3
        )
        "#,
    )
    .bind(intent_id)
    .bind(product_id)
    .bind(expires_at)
    .execute(&pool)
    .await
    .expect("failed to create inventory reservation");

    // -----------------------------------------------------
    // 8. Checkout
    // -----------------------------------------------------

    sqlx::query(
        r#"
        INSERT INTO checkouts (
            id,
            session_id,
            customer_id,
            cart_id,
            agent_action_id,
            agent_intent_id,
            amount,
            currency,
            status,
            razorpay_order_id
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            NULL,
            $5,
            100,
            'INR',
            'PENDING',
            $6
        )
        "#,
    )
    .bind(checkout_id)
    .bind(session_id)
    .bind(customer_id)
    .bind(cart_id)
    .bind(intent_id)
    .bind(&razorpay_order_id)
    .execute(&pool)
    .await
    .expect("failed to create checkout");

    // -----------------------------------------------------
    // 9. Execute failure reconciliation
    // -----------------------------------------------------

    let returned_session =
        backend::db::queries::reconcile_failed_payment(&pool, &razorpay_order_id, intent_id)
            .await
            .expect("failed payment reconciliation failed");

    assert_eq!(returned_session, session_id);

    // -----------------------------------------------------
    // 10. Checkout must become FAILED
    // -----------------------------------------------------

    let checkout_status: String = sqlx::query_scalar(
        r#"
            SELECT status::text
            FROM checkouts
            WHERE id = $1
            "#,
    )
    .bind(checkout_id)
    .fetch_one(&pool)
    .await
    .expect("failed to read checkout status");

    assert_eq!(checkout_status, "FAILED");

    // -----------------------------------------------------
    // 11. Intent must return to AUTHORIZED
    // -----------------------------------------------------

    let intent_status: String = sqlx::query_scalar(
        r#"
            SELECT status
            FROM signed_agent_intents
            WHERE id = $1
            "#,
    )
    .bind(intent_id)
    .fetch_one(&pool)
    .await
    .expect("failed to read intent status");

    assert_eq!(intent_status, "AUTHORIZED");

    // -----------------------------------------------------
    // 12. Inventory reservation must be released
    // -----------------------------------------------------

    let reservation_status: String = sqlx::query_scalar(
        r#"
            SELECT status::text
            FROM inventory_reservations
            WHERE intent_id = $1
              AND product_id = $2
            "#,
    )
    .bind(intent_id)
    .bind(product_id)
    .fetch_one(&pool)
    .await
    .expect("failed to read reservation status");

    assert_eq!(reservation_status, "RELEASED");

    // -----------------------------------------------------
    // 13. Physical stock must remain unchanged
    // -----------------------------------------------------

    let stock: i64 = sqlx::query_scalar(
        r#"
            SELECT stock
            FROM products
            WHERE id = $1
            "#,
    )
    .bind(product_id)
    .fetch_one(&pool)
    .await
    .expect("failed to read product stock");

    assert_eq!(stock, 1, "failed payment must not reduce physical stock");

    // -----------------------------------------------------
    // 14. Cleanup
    // -----------------------------------------------------

    sqlx::query("DELETE FROM checkouts WHERE id = $1")
        .bind(checkout_id)
        .execute(&pool)
        .await
        .expect("failed to cleanup checkout");

    sqlx::query("DELETE FROM inventory_reservations WHERE intent_id = $1")
        .bind(intent_id)
        .execute(&pool)
        .await
        .expect("failed to cleanup reservation");

    sqlx::query("DELETE FROM signed_agent_intents WHERE id = $1")
        .bind(intent_id)
        .execute(&pool)
        .await
        .expect("failed to cleanup intent");

    sqlx::query("DELETE FROM agent_decisions WHERE id = $1")
        .bind(decision_id)
        .execute(&pool)
        .await
        .expect("failed to cleanup decision");

    sqlx::query("DELETE FROM carts WHERE id = $1")
        .bind(cart_id)
        .execute(&pool)
        .await
        .expect("failed to cleanup cart");

    sqlx::query("DELETE FROM products WHERE id = $1")
        .bind(product_id)
        .execute(&pool)
        .await
        .expect("failed to cleanup product");

    sqlx::query("DELETE FROM agent_sessions WHERE id = $1")
        .bind(session_id)
        .execute(&pool)
        .await
        .expect("failed to cleanup session");

    sqlx::query("DELETE FROM customers WHERE id = $1")
        .bind(customer_id)
        .execute(&pool)
        .await
        .expect("failed to cleanup customer");
}
