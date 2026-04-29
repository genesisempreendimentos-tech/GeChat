/*
  CORREÇÃO DO CHAT (erro 500)
  Execute no SQL Editor do Supabase se o chat já foi criado e está dando 500.
  Isso ajusta as políticas RLS e o trigger sem apagar dados.
*/

-- 1) Remover políticas antigas do chat
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view own participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can insert participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON messages;

-- 2) Remover trigger antigo (pode dar erro se não existir, pode ignorar)
DROP TRIGGER IF EXISTS trigger_messages_updated_at ON messages;

-- 3) Garantir que a função do trigger existe e recriar o trigger
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_messages_updated_at
  AFTER INSERT ON messages FOR EACH ROW EXECUTE PROCEDURE update_conversation_updated_at();

-- 4) Função auxiliar para RLS (evita 500 por subconsulta recursiva na mesma tabela)
CREATE OR REPLACE FUNCTION public.get_my_conversation_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid();
$$;

-- Permissão para os roles do Supabase conseguirem executar a função (evita 403)
GRANT EXECUTE ON FUNCTION public.get_my_conversation_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_conversation_ids() TO anon;
GRANT EXECUTE ON FUNCTION public.get_my_conversation_ids() TO service_role;

-- 5) Políticas novas usando a função (TO authenticated para usuários logados)
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
