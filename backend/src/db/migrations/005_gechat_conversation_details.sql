ALTER TABLE gechat_conversations
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
