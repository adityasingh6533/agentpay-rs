use std::sync::Arc;

use backend::db::queries::{self, WebhookEventInsert};
use chrono::Utc;
use sqlx::{PgPool, postgres::PgPoolOptions};
use tokio::sync::Barrier;
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

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn duplicate_webhook_event_is_processed_only_once() {
    let pool = test_pool().await;

    let event_id = format!("test_webhook_{}", Uuid::new_v4());

    let event = WebhookEventInsert {
        event_id: event_id.clone(),
        event_type: "payment.captured".to_string(),
        razorpay_order_id: Some(format!("order_{}", Uuid::new_v4())),
        razorpay_payment_id: Some(format!("pay_{}", Uuid::new_v4())),
        payload: serde_json::json!({
            "event": "payment.captured",
            "test": true,
            "created_at": Utc::now(),
        }),
    };

    // -----------------------------------------------------
    // First insertion
    // -----------------------------------------------------

    let first = queries::insert_webhook_event(&pool, &event)
        .await
        .expect("first webhook insertion failed");

    assert!(first, "first webhook event must be inserted");

    // -----------------------------------------------------
    // Same event inserted again
    // -----------------------------------------------------

    let second = queries::insert_webhook_event(&pool, &event)
        .await
        .expect("duplicate webhook insertion failed");

    assert!(!second, "duplicate webhook event must not be inserted");

    // -----------------------------------------------------
    // Verify exactly one database row exists
    // -----------------------------------------------------

    let count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM webhook_events
        WHERE provider = 'razorpay'
          AND event_id = $1
        "#,
    )
    .bind(&event_id)
    .fetch_one(&pool)
    .await
    .expect("failed to count webhook events");

    assert_eq!(count, 1, "duplicate webhook must create exactly one row");

    // -----------------------------------------------------
    // Cleanup
    // -----------------------------------------------------

    sqlx::query(
        r#"
        DELETE FROM webhook_events
        WHERE provider = 'razorpay'
          AND event_id = $1
        "#,
    )
    .bind(&event_id)
    .execute(&pool)
    .await
    .expect("failed to cleanup webhook event");
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn concurrent_duplicate_webhooks_allow_only_one_insert() {
    let pool = test_pool().await;

    let event_id = format!("concurrent_webhook_{}", Uuid::new_v4());

    let event = WebhookEventInsert {
        event_id: event_id.clone(),
        event_type: "payment.captured".to_string(),
        razorpay_order_id: Some(format!("order_{}", Uuid::new_v4())),
        razorpay_payment_id: Some(format!("pay_{}", Uuid::new_v4())),
        payload: serde_json::json!({
            "event": "payment.captured",
            "concurrent_test": true,
        }),
    };

    let event = Arc::new(event);
    let barrier = Arc::new(Barrier::new(10));

    let mut handles = Vec::new();

    // -----------------------------------------------------
    // 10 concurrent workers submit the SAME event
    // -----------------------------------------------------

    for _ in 0..10 {
        let pool = pool.clone();
        let event = Arc::clone(&event);
        let barrier = Arc::clone(&barrier);

        handles.push(tokio::spawn(async move {
            barrier.wait().await;

            queries::insert_webhook_event(&pool, &event)
                .await
                .expect("webhook insertion failed")
        }));
    }

    // -----------------------------------------------------
    // Collect results
    // -----------------------------------------------------

    let mut inserted_count = 0;

    for handle in handles {
        if handle.await.expect("webhook task panicked") {
            inserted_count += 1;
        }
    }

    // -----------------------------------------------------
    // Exactly ONE worker may insert the event
    // -----------------------------------------------------

    assert_eq!(
        inserted_count, 1,
        "exactly one concurrent webhook insertion must succeed"
    );

    // -----------------------------------------------------
    // Verify database state
    // -----------------------------------------------------

    let count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM webhook_events
        WHERE provider = 'razorpay'
          AND event_id = $1
        "#,
    )
    .bind(&event_id)
    .fetch_one(&pool)
    .await
    .expect("failed to count concurrent webhook events");

    assert_eq!(count, 1, "database must contain exactly one webhook event");

    // -----------------------------------------------------
    // Cleanup
    // -----------------------------------------------------

    sqlx::query(
        r#"
        DELETE FROM webhook_events
        WHERE provider = 'razorpay'
          AND event_id = $1
        "#,
    )
    .bind(&event_id)
    .execute(&pool)
    .await
    .expect("failed to cleanup concurrent webhook event");
}
