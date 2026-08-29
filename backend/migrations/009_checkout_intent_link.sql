ALTER TABLE checkouts
ADD COLUMN IF NOT EXISTS agent_intent_id UUID
REFERENCES signed_agent_intents(id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_checkouts_agent_intent
ON checkouts(agent_intent_id)
WHERE agent_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_checkouts_agent_intent
ON checkouts(agent_intent_id);