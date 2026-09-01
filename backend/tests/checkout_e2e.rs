use chrono::{Duration, Utc};
use sqlx::{PgPool, postgres::PgPoolOptions};
use uuid::Uuid;

use backend::{
    agent::signed_intent::{AgentIntentPayload, SignedAgentIntent},
    db::queries,
};

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
async fn checkout_lifecycle_completes_successfully() {
    let pool = test_pool().await;

    let customer_id = Uuid::new_v4();
    let session_id = Uuid::new_v4();
    let decision_id = Uuid::new_v4();
    let intent_id = Uuid::new_v4();
    let product_id = Uuid::new_v4();

    let nonce = Uuid::new_v4();

    let expires_at = Utc::now() + Duration::minutes(10);

    let razorpay_order_id = format!("order_e2e_{}", Uuid::new_v4());

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
            'E2E Test Customer',
            $2
        )
        "#,
    )
    .bind(customer_id)
    .bind(format!("e2e-{}@example.com", customer_id))
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
    .expect("failed to create agent session");

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
            'E2E Test Product',
            'Temporary product for checkout lifecycle test',
            'TEST',
            500,
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
    // 4. Agent decision
    // -----------------------------------------------------

    sqlx::query(
        r#"
        INSERT INTO agent_decisions (
            id,
            session_id,
            decision_type,
            reasoning,
            confidence,
            requires_confirmation
        )
        VALUES (
            $1,
            $2,
            'PURCHASE',
            'E2E checkout decision',
            1.0,
            FALSE
        )
        "#,
    )
    .bind(decision_id)
    .bind(session_id)
    .execute(&pool)
    .await
    .expect("failed to create agent decision");

    // -----------------------------------------------------
    // 5. Build signed intent
    // -----------------------------------------------------

    let intent = SignedAgentIntent {
        payload: AgentIntentPayload {
            intent_id,
            session_id,
            action: "CREATE_ORDER".to_string(),
            amount: 500,
            currency: "INR".to_string(),
            category: "TEST".to_string(),
            product_ids: vec![product_id],
            requires_confirmation: false,
            nonce,
            issued_at: Utc::now(),
            expires_at,
        },
        signature: "e2e-test-signature".to_string(),
    };

    // -----------------------------------------------------
    // 6. Persist signed intent
    // -----------------------------------------------------

    queries::save_signed_agent_intent(&pool, &intent)
        .await
        .expect("failed to save signed agent intent");

    // -----------------------------------------------------
    // 7. Reserve inventory
    // -----------------------------------------------------

    let reserved = queries::reserve_inventory(&pool, intent_id, &[product_id], expires_at)
        .await
        .expect("failed to reserve inventory");

    assert!(reserved, "inventory reservation must succeed");

    // -----------------------------------------------------
    // 8. Mark intent PROCESSING
    // -----------------------------------------------------

    sqlx::query(
        r#"
        UPDATE signed_agent_intents
        SET status = 'PROCESSING'
        WHERE id = $1
        "#,
    )
    .bind(intent_id)
    .execute(&pool)
    .await
    .expect("failed to mark intent as processing");

    // -----------------------------------------------------
    // 9. Create checkout
    // -----------------------------------------------------

    let checkout_id = queries::create_checkout_for_intent(&pool, &intent, &razorpay_order_id)
        .await
        .expect("failed to create checkout");

    // -----------------------------------------------------
    // 10. Verify checkout starts PENDING
    // -----------------------------------------------------

    let initial_status: String = sqlx::query_scalar(
        r#"
            SELECT status::text
            FROM checkouts
            WHERE id = $1
            "#,
    )
    .bind(checkout_id)
    .fetch_one(&pool)
    .await
    .expect("failed to read initial checkout status");

    assert_eq!(initial_status, "PENDING");

    // -----------------------------------------------------
    // 11. Simulate successful Razorpay payment
    // -----------------------------------------------------

    let returned_session =
        queries::reconcile_successful_payment(&pool, &razorpay_order_id, intent_id)
            .await
            .expect("payment reconciliation failed");

    assert_eq!(returned_session, session_id);

    // -----------------------------------------------------
    // 12. Checkout → PAID
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
    // 13. Intent → CONSUMED
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
    // 14. Reservation → COMPLETED
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
    // 15. Stock → 0
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

    assert_eq!(stock, 0, "successful checkout must consume inventory");

    // -----------------------------------------------------
    // 16. Verify checkout amount
    // -----------------------------------------------------

    let amount: i64 = sqlx::query_scalar(
        r#"
            SELECT amount
            FROM checkouts
            WHERE id = $1
            "#,
    )
    .bind(checkout_id)
    .fetch_one(&pool)
    .await
    .expect("failed to read checkout amount");

    assert_eq!(amount, 500);

    // -----------------------------------------------------
    // 17. Cleanup
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

    sqlx::query("DELETE FROM cart_items WHERE product_id = $1")
        .bind(product_id)
        .execute(&pool)
        .await
        .expect("failed to cleanup cart items");

    sqlx::query("DELETE FROM carts WHERE session_id = $1")
        .bind(session_id)
        .execute(&pool)
        .await
        .expect("failed to cleanup carts");

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
