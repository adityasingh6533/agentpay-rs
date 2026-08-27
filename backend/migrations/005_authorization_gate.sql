CREATE TABLE IF NOT EXISTS authorization_attempts (
    id UUID PRIMARY KEY,
    intent_id UUID NOT NULL,
    nonce UUID NOT NULL,

    decision VARCHAR(20) NOT NULL,

    reason TEXT NOT NULL,

    authorized_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT authorization_attempts_decision_check
        CHECK (decision IN ('AUTHORIZED', 'REVIEW', 'BLOCKED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_authorization_attempts_intent
ON authorization_attempts(intent_id);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_authorization_attempts_nonce
ON authorization_attempts(nonce);

CREATE INDEX IF NOT EXISTS
idx_authorization_attempts_created_at
ON authorization_attempts(created_at);