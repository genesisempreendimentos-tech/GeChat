-- Sugestão de política RLS para INSERT em public.audit_logs (Supabase).
-- Aplicar manualmente no SQL Editor se inserts do cliente autenticado falharem.
-- Ajuste nomes de política se já existirem políticas na tabela.

-- ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "audit_logs_insert_own_actor"
-- ON public.audit_logs
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (actor_user_id = auth.uid());

-- Opcional: leitura apenas dos próprios logs ou via service role no admin.
-- CREATE POLICY "audit_logs_select_own_actor"
-- ON public.audit_logs
-- FOR SELECT
-- TO authenticated
-- USING (actor_user_id = auth.uid());
