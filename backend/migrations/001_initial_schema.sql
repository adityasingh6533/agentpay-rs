CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- CUSTOMERS
-- =========================================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name TEXT NOT NULL,
    email TEXT UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- PRODUCTS
-- =========================================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,

    price BIGINT NOT NULL CHECK (price >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'INR',

    stock BIGINT NOT NULL DEFAULT 0
        CHECK (stock >= 0),

    rating NUMERIC(3,2)
        CHECK (rating >= 0 AND rating <= 5),

    review_count BIGINT NOT NULL DEFAULT 0
        CHECK (review_count >= 0),

    active BOOLEAN NOT NULL DEFAULT TRUE,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category
    ON products(category);

CREATE INDEX idx_products_active_stock
    ON products(active, stock);

CREATE INDEX idx_products_price
    ON products(price);

-- =========================================================
-- AGENT SESSIONS
-- =========================================================

CREATE TYPE agent_session_status AS ENUM (
    'IDLE',
    'UNDERSTANDING',
    'SEARCHING',
    'DECIDING',
    'GUARDRAIL_CHECK',
    'AWAITING_CONFIRMATION',
    'AUTHORIZED',
    'CHECKOUT',
    'COMPLETED',
    'REVIEW_REQUIRED',
    'BLOCKED',
    'FAILED'
);

CREATE TABLE agent_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    customer_id UUID NOT NULL
        REFERENCES customers(id),

    status agent_session_status NOT NULL DEFAULT 'IDLE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_sessions_customer
    ON agent_sessions(customer_id);

CREATE INDEX idx_agent_sessions_status
    ON agent_sessions(status);

-- =========================================================
-- AGENT INTENTS
-- =========================================================

CREATE TABLE agent_intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    session_id UUID NOT NULL
        REFERENCES agent_sessions(id)
        ON DELETE CASCADE,

    message TEXT NOT NULL,

    category TEXT,
    budget BIGINT,
    currency CHAR(3),

    confidence NUMERIC(5,4)
        CHECK (
            confidence >= 0
            AND confidence <= 1
        ),

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_intents_session
    ON agent_intents(session_id);

-- =========================================================
-- CARTS
-- =========================================================

CREATE TYPE cart_status AS ENUM (
    'ACTIVE',
    'CHECKOUT',
    'COMPLETED',
    'ABANDONED'
);

CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    session_id UUID NOT NULL
        REFERENCES agent_sessions(id)
        ON DELETE CASCADE,

    status cart_status NOT NULL DEFAULT 'ACTIVE',

    subtotal BIGINT NOT NULL DEFAULT 0,
    discount BIGINT NOT NULL DEFAULT 0,
    delivery_fee BIGINT NOT NULL DEFAULT 0,
    total BIGINT NOT NULL DEFAULT 0,

    currency CHAR(3) NOT NULL DEFAULT 'INR',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_carts_session
    ON carts(session_id);

-- =========================================================
-- CART ITEMS
-- =========================================================

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    cart_id UUID NOT NULL
        REFERENCES carts(id)
        ON DELETE CASCADE,

    product_id UUID NOT NULL
        REFERENCES products(id),

    product_name TEXT NOT NULL,

    quantity BIGINT NOT NULL
        CHECK (quantity > 0),

    unit_price BIGINT NOT NULL
        CHECK (unit_price >= 0),

    total_price BIGINT NOT NULL
        CHECK (total_price >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(cart_id, product_id)
);

CREATE INDEX idx_cart_items_cart
    ON cart_items(cart_id);

-- =========================================================
-- AGENT DECISIONS
-- =========================================================

CREATE TABLE agent_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    session_id UUID NOT NULL
        REFERENCES agent_sessions(id)
        ON DELETE CASCADE,

    intent_id UUID
        REFERENCES agent_intents(id),

    decision_type TEXT NOT NULL,

    reasoning TEXT NOT NULL,

    confidence NUMERIC(5,4)
        CHECK (
            confidence >= 0
            AND confidence <= 1
        ),

    recommendation JSONB,

    cart_id UUID
        REFERENCES carts(id),

    requires_confirmation BOOLEAN
        NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_decisions_session
    ON agent_decisions(session_id);

-- =========================================================
-- SPENDING POLICIES
-- =========================================================

CREATE TABLE spending_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    merchant_id UUID NOT NULL,

    max_transaction_amount BIGINT NOT NULL
        CHECK (max_transaction_amount > 0),

    daily_transaction_limit BIGINT NOT NULL
        CHECK (daily_transaction_limit > 0),

    requires_confirmation_above BIGINT NOT NULL
        CHECK (requires_confirmation_above >= 0),

    allowed_categories TEXT[] NOT NULL DEFAULT '{}',

    currency CHAR(3) NOT NULL DEFAULT 'INR',

    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spending_policies_merchant
    ON spending_policies(merchant_id, active);

-- =========================================================
-- AGENT ACTIONS
-- =========================================================

CREATE TYPE agent_action_status AS ENUM (
    'PENDING',
    'AUTHORIZED',
    'EXECUTED',
    'REVIEW_REQUIRED',
    'BLOCKED',
    'FAILED'
);

CREATE TABLE agent_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    session_id UUID NOT NULL
        REFERENCES agent_sessions(id)
        ON DELETE CASCADE,

    decision_id UUID NOT NULL
        REFERENCES agent_decisions(id),

    action_type TEXT NOT NULL,

    status agent_action_status
        NOT NULL DEFAULT 'PENDING',

    amount BIGINT NOT NULL
        CHECK (amount >= 0),

    currency CHAR(3) NOT NULL DEFAULT 'INR',

    nonce UUID NOT NULL UNIQUE,

    signature TEXT,

    payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    expires_at TIMESTAMPTZ NOT NULL,

    authorized_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_actions_session
    ON agent_actions(session_id);

CREATE INDEX idx_agent_actions_status
    ON agent_actions(status);

CREATE INDEX idx_agent_actions_expiry
    ON agent_actions(expires_at);

-- =========================================================
-- AUDIT EVENTS
-- =========================================================

CREATE TYPE audit_actor AS ENUM (
    'CUSTOMER',
    'AGENT',
    'SYSTEM',
    'MERCHANT'
);

CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    session_id UUID NOT NULL
        REFERENCES agent_sessions(id)
        ON DELETE CASCADE,

    event_type TEXT NOT NULL,

    actor audit_actor NOT NULL,

    status TEXT NOT NULL,

    message TEXT NOT NULL,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_events_session_time
    ON audit_events(session_id, created_at DESC);

-- =========================================================
-- CHECKOUTS
-- =========================================================

CREATE TYPE checkout_status AS ENUM (
    'CREATED',
    'PENDING',
    'PAID',
    'FAILED',
    'CANCELLED'
);

CREATE TABLE checkouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    session_id UUID NOT NULL
        REFERENCES agent_sessions(id),

    customer_id UUID NOT NULL
        REFERENCES customers(id),

    cart_id UUID NOT NULL
        REFERENCES carts(id),

    agent_action_id UUID
        REFERENCES agent_actions(id),

    amount BIGINT NOT NULL
        CHECK (amount >= 0),

    currency CHAR(3) NOT NULL DEFAULT 'INR',

    status checkout_status
        NOT NULL DEFAULT 'CREATED',

    razorpay_order_id TEXT UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checkouts_session
    ON checkouts(session_id);

CREATE INDEX idx_checkouts_razorpay
    ON checkouts(razorpay_order_id);