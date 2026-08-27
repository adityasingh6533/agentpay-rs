CREATE TABLE IF NOT EXISTS signed_agent_intents (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    amount BIGINT NOT NULL,
    currency VARCHAR(10) NOT NULL,
    category VARCHAR(100) NOT NULL,

    product_ids UUID[] NOT NULL DEFAULT '{}',

    requires_confirmation BOOLEAN NOT NULL,

    nonce UUID NOT NULL UNIQUE,

    issued_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,

    signature VARCHAR(128) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'ISSUED',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT signed_agent_intents_amount_positive
        CHECK (amount > 0),

    CONSTRAINT signed_agent_intents_expiry_valid
        CHECK (expires_at > issued_at)
);

CREATE INDEX IF NOT EXISTS idx_signed_agent_intents_session
ON signed_agent_intents(session_id);

CREATE INDEX IF NOT EXISTS idx_signed_agent_intents_status
ON signed_agent_intents(status);

CREATE INDEX IF NOT EXISTS idx_signed_agent_intents_expires
ON signed_agent_intents(expires_at);