/*
  SUPABASE DATABASE SCHEMA
  
  Execute these SQL commands in your Supabase SQL Editor to set up the database:
*/

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'user')),
  avatar VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Systems table
CREATE TABLE systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  url VARCHAR(500) NOT NULL,
  category VARCHAR(100) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User system access table
CREATE TABLE user_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  system_id UUID REFERENCES systems(id) ON DELETE CASCADE,
  can_access BOOLEAN DEFAULT true,
  is_favorite BOOLEAN DEFAULT false,
  UNIQUE(user_id, system_id)
);

-- Access logs table
CREATE TABLE access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  system_id UUID REFERENCES systems(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_user_systems_user_id ON user_systems(user_id);
CREATE INDEX idx_user_systems_system_id ON user_systems(system_id);
CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_timestamp ON access_logs(timestamp DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Users can read all users
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

-- New users can insert their own row on signup (id = auth.uid())
CREATE POLICY "Users can insert own row on signup" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

-- Only admins can update/delete other users
CREATE POLICY "Admins can modify users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view all systems
CREATE POLICY "Users can view systems" ON systems
  FOR SELECT USING (active = true);

-- Only admins can modify systems
CREATE POLICY "Admins can modify systems" ON systems
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view their own access permissions
CREATE POLICY "Users can view own access" ON user_systems
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own access (ex.: ao favoritar um sistema sem linha prévia)
CREATE POLICY "Users can insert own access" ON user_systems
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own favorites
CREATE POLICY "Users can update own favorites" ON user_systems
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can manage all access permissions
CREATE POLICY "Admins can manage access" ON user_systems
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view their own logs
CREATE POLICY "Users can view own logs" ON access_logs
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own logs
CREATE POLICY "Users can insert own logs" ON access_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ========== CHAT ==========
-- Conversas (DM entre 2 usuários)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participantes de cada conversa (2 por conversa em DM)
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(conversation_id, user_id)
);

-- Mensagens
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Atualizar updated_at da conversa ao inserir mensagem
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- EXECUTE PROCEDURE para compatibilidade com versões do Postgres no Supabase
CREATE TRIGGER trigger_messages_updated_at
  AFTER INSERT ON messages FOR EACH ROW EXECUTE PROCEDURE update_conversation_updated_at();

-- Função auxiliar para RLS: evita subconsulta recursiva na mesma tabela (que pode causar 500)
CREATE OR REPLACE FUNCTION public.get_my_conversation_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_conversation_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_conversation_ids() TO anon;
GRANT EXECUTE ON FUNCTION public.get_my_conversation_ids() TO service_role;

-- RLS Chat
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Usuário só vê conversas em que participa (TO authenticated = usuário logado)
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT TO authenticated USING (id IN (SELECT get_my_conversation_ids()));
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE TO authenticated USING (id IN (SELECT get_my_conversation_ids()));

CREATE POLICY "Users can view own participants" ON conversation_participants
  FOR SELECT TO authenticated USING (conversation_id IN (SELECT get_my_conversation_ids()));
CREATE POLICY "Users can insert participants" ON conversation_participants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view messages in own conversations" ON messages
  FOR SELECT TO authenticated USING (conversation_id IN (SELECT get_my_conversation_ids()));
CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
