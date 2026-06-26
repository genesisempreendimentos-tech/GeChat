ALTER TABLE gechat_conversations
  ADD COLUMN IF NOT EXISTS only_admins_can_send BOOLEAN NOT NULL DEFAULT FALSE;
