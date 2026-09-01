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
async fn successful_payment_finalizes_checkout_intent_and_inventory() {
    let pool = test_pool().await;

    let customer_id = Uuid::new_v4();
    let session_id = Uuid::new_v4();
    let decision_id = Uuid::new_v4();
    let intent_id = Uuid::new_v4();
    let cart_id = Uuid::new_v4();
    let checkout_id = Uuid::new_v4();
    let product_id = Uuid::new_v4();

    let razorpay_order_id = format!("order_success_test_{}", Uuid::new_v4());

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
            'Success Test Customer',
            $2
        )
        "#,
    )
    .bind(customer_id)
    .bind(format!("success-{}@example.com", customer_id))
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
    // 3. Product with stock = 1
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
            'Payment Success Test Product',
            'Temporary product used for payment success testing',
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
            discount,
            delivery_fee,
            total,
            currency
        )
        VALUES (
            $1,
            $2,
            'CHECKOUT',
            100,
            0,
            0,
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
            'Integration test purchase decision',
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
    .expect("failed to create signed agent intent");

    // -----------------------------------------------------
    // 7. Reserve inventory
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
    // 8. Checkout in PENDING state
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
    // 9. Reconcile successful payment
    // -----------------------------------------------------

    let returned_session =
        backend::db::queries::reconcile_successful_payment(&pool, &razorpay_order_id, intent_id)
            .await
            .expect("successful payment reconciliation failed");

    assert_eq!(returned_session, session_id);

    // -----------------------------------------------------
    // 10. Checkout must become PAID
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

    assert_eq!(checkout_status, "PAID");

    // -----------------------------------------------------
    // 11. Intent must become CONSUMED
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

    assert_eq!(intent_status, "CONSUMED");

    // -----------------------------------------------------
    // 12. Reservation must become COMPLETED
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

    assert_eq!(reservation_status, "COMPLETED");

    // -----------------------------------------------------
    // 13. Physical stock must decrease
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

    assert_eq!(
        stock, 0,
        "successful payment must consume reserved inventory"
    );

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
