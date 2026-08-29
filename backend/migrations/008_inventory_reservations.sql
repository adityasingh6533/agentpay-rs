-- =========================================================
-- INVENTORY RESERVATIONS
-- =========================================================

CREATE TYPE inventory_reservation_status AS ENUM (
    'RESERVED',
    'RELEASED',
    'COMPLETED',
    'EXPIRED'
);

CREATE TABLE inventory_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    intent_id UUID NOT NULL
        REFERENCES signed_agent_intents(id)
        ON DELETE CASCADE,

    product_id UUID NOT NULL
        REFERENCES products(id),

    quantity BIGINT NOT NULL
        CHECK (quantity > 0),

    status inventory_reservation_status
        NOT NULL DEFAULT 'RESERVED',

    expires_at TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(intent_id, product_id)
);

CREATE INDEX idx_inventory_reservations_intent
    ON inventory_reservations(intent_id);

CREATE INDEX idx_inventory_reservations_product_status
    ON inventory_reservations(product_id, status);

CREATE INDEX idx_inventory_reservations_expiry
    ON inventory_reservations(expires_at);