-- =========================================================
-- RAZORPAY WEBHOOK EVENTS
-- =========================================================

CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,

    event_type TEXT NOT NULL,

    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,

    status TEXT NOT NULL DEFAULT 'RECEIVED',

    payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_webhook_events_provider_event
    ON webhook_events(provider, event_id);

CREATE INDEX idx_webhook_events_order
    ON webhook_events(razorpay_order_id);

CREATE INDEX idx_webhook_events_created
    ON webhook_events(created_at DESC);