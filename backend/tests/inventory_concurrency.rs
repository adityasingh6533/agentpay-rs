use chrono::{Duration, Utc};
use sqlx::{PgPool, postgres::PgPoolOptions};
use uuid::Uuid;

async fn test_pool() -> PgPool {
    // Load backend/.env for integration tests.
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

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn concurrent_inventory_reservation_allows_only_one_checkout() {
    let pool = test_pool().await;

    let product_id = Uuid::new_v4();
    let intent_a = Uuid::new_v4();
    let intent_b = Uuid::new_v4();

    let expires_at = Utc::now() + Duration::minutes(5);

    // -----------------------------------------------------
    // 1. Create isolated test product
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
            'Concurrency Test Product',
            'Temporary product used for concurrency testing',
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
    .expect("failed to create test product");

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
        VALUES
            (
                $1,
                $3,
                'CREATE_ORDER',
                100,
                'INR',
                'TEST',
                ARRAY[$5]::uuid[],
                FALSE,
                $6,
                NOW(),
                $8,
                'test-signature-a',
                'AUTHORIZED'
            ),
            (
                $2,
                $4,
                'CREATE_ORDER',
                100,
                'INR',
                'TEST',
                ARRAY[$5]::uuid[],
                FALSE,
                $7,
                NOW(),
                $8,
                'test-signature-b',
                'AUTHORIZED'
            )
        "#,
    )
    .bind(intent_a)
    .bind(intent_b)
    .bind(Uuid::new_v4())
    .bind(Uuid::new_v4())
    .bind(product_id)
    .bind(Uuid::new_v4())
    .bind(Uuid::new_v4())
    .bind(expires_at)
    .execute(&pool)
    .await
    .expect("failed to create test signed intents");

    // -----------------------------------------------------
    // 2. Start two concurrent reservations
    // -----------------------------------------------------

    let pool_a = pool.clone();
    let pool_b = pool.clone();

    let expires_a = expires_at;
    let expires_b = expires_at;

    let task_a = tokio::spawn(async move {
        backend::db::queries::reserve_inventory(&pool_a, intent_a, &[product_id], expires_a)
            .await
            .expect("reservation A failed")
    });

    let task_b = tokio::spawn(async move {
        backend::db::queries::reserve_inventory(&pool_b, intent_b, &[product_id], expires_b)
            .await
            .expect("reservation B failed")
    });

    let result_a = task_a.await.expect("reservation task A panicked");

    let result_b = task_b.await.expect("reservation task B panicked");

    // -----------------------------------------------------
    // 3. Exactly ONE reservation must succeed
    // -----------------------------------------------------

    assert_ne!(
        result_a, result_b,
        "exactly one concurrent reservation must succeed"
    );

    assert!(
        result_a || result_b,
        "at least one reservation must succeed"
    );

    // -----------------------------------------------------
    // 4. Verify exactly one active reservation
    // -----------------------------------------------------

    let reserved_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM inventory_reservations
        WHERE product_id = $1
          AND status = 'RESERVED'::inventory_reservation_status
          AND expires_at > NOW()
        "#,
    )
    .bind(product_id)
    .fetch_one(&pool)
    .await
    .expect("failed to count active reservations");

    assert_eq!(
        reserved_count, 1,
        "only one active reservation may exist for stock = 1"
    );

    // -----------------------------------------------------
    // 5. Reservation must NOT decrement physical stock
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

    assert_eq!(stock, 1, "reservation must not decrement physical stock");

    // -----------------------------------------------------
    // 6. Cleanup
    // -----------------------------------------------------

    sqlx::query(
        r#"
        DELETE FROM inventory_reservations
        WHERE product_id = $1
        "#,
    )
    .bind(product_id)
    .execute(&pool)
    .await
    .expect("failed to cleanup inventory reservations");

    sqlx::query(
        r#"
        DELETE FROM signed_agent_intents
        WHERE id IN ($1, $2)
        "#,
    )
    .bind(intent_a)
    .bind(intent_b)
    .execute(&pool)
    .await
    .expect("failed to cleanup signed intents");

    sqlx::query(
        r#"
        DELETE FROM products
        WHERE id = $1
        "#,
    )
    .bind(product_id)
    .execute(&pool)
    .await
    .expect("failed to cleanup test product");
}
