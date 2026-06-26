-- Preferências de privacidade por usuário (confirmação de leitura e última visualização)

CREATE TABLE IF NOT EXISTS gechat_user_privacy (
  user_id UUID PRIMARY KEY,
  read_receipts_enabled BOOLEAN NOT NULL DEFAULT true,
  last_seen_visible BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
