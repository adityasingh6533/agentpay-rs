CREATE TABLE IF NOT EXISTS checkout_confirmations (
    id UUID PRIMARY KEY,
    intent_id UUID NOT NULL UNIQUE,
    session_id UUID NOT NULL,

    token_hash VARCHAR(128) NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT checkout_confirmation_expiry
        CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS
idx_checkout_confirmations_session
ON checkout_confirmations(session_id);

CREATE INDEX IF NOT EXISTS
idx_checkout_confirmations_expiry
ON checkout_confirmations(expires_at);