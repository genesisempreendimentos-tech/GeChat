-- GêChat: marcação de mensagens editadas

ALTER TABLE gechat_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
