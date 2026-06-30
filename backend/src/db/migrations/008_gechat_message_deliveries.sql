CREATE TABLE IF NOT EXISTS gechat_message_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES gechat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_gechat_message_deliveries_message ON gechat_message_deliveries(message_id);
