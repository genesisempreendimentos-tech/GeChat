-- GêChat schema (Neon Postgres)

CREATE TABLE IF NOT EXISTS gechat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'channel')),
  name TEXT,
  channel_subtype TEXT CHECK (channel_subtype IS NULL OR channel_subtype IN ('geral', 'setor', 'projeto', 'avisos')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gechat_conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES gechat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS gechat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES gechat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'audio')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gechat_message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES gechat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS gechat_user_presence (
  user_id UUID PRIMARY KEY,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gechat_members_user ON gechat_conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_gechat_members_conversation ON gechat_conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_gechat_messages_conversation_created ON gechat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gechat_messages_sender ON gechat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_gechat_message_reads_message ON gechat_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_gechat_conversations_type ON gechat_conversations(type);
