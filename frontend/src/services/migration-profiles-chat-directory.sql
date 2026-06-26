-- GêChat – permite que usuários autenticados leiam perfis ativos para iniciar conversas.
-- Execute no SQL Editor do Supabase (complementa as políticas existentes em profiles).

DROP POLICY IF EXISTS "Authenticated can read active profiles for chat" ON public.profiles;

CREATE POLICY "Authenticated can read active profiles for chat"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    COALESCE(NULLIF(TRIM(profile_status), ''), 'active') = 'active'
  );
