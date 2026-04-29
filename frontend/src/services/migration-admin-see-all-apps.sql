/*
  Permissões para ver sistemas (apps) e ADMIN gerenciar tudo
  
  Execute no Supabase: SQL Editor → New query → Cole → Run.
  
  1) Qualquer usuário autenticado pode LER a tabela apps (sistemas aparecem para todos).
  2) Admin (role = 'admin' em profiles) pode gerenciar apps, user_app_access e audit_logs.
*/

-- Função auxiliar: retorna true se o usuário logado é admin em public.profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Apps: qualquer usuário autenticado pode LER (para os sistemas aparecerem)
DROP POLICY IF EXISTS "Admins can read all apps" ON public.apps;
DROP POLICY IF EXISTS "Authenticated can read apps" ON public.apps;
CREATE POLICY "Authenticated can read apps" ON public.apps
  FOR SELECT
  TO authenticated
  USING (true);

-- Apps: admin pode inserir/atualizar/deletar
DROP POLICY IF EXISTS "Admins can manage all apps" ON public.apps;
CREATE POLICY "Admins can manage all apps" ON public.apps
  FOR ALL
  USING (public.is_admin());

-- User_app_access: coluna para favoritar (qualquer usuário pode salvar seu favorito)
ALTER TABLE public.user_app_access
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

-- User_app_access: ativar RLS (se ainda não estiver) e políticas para favoritos
ALTER TABLE public.user_app_access ENABLE ROW LEVEL SECURITY;

-- User_app_access: usuário pode ver/inserir/atualizar apenas seus próprios registros (favoritos e acesso)
DROP POLICY IF EXISTS "Users can read own user_app_access" ON public.user_app_access;
CREATE POLICY "Users can read own user_app_access" ON public.user_app_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own user_app_access" ON public.user_app_access;
CREATE POLICY "Users can insert own user_app_access" ON public.user_app_access
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own user_app_access" ON public.user_app_access;
CREATE POLICY "Users can update own user_app_access" ON public.user_app_access
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- User_app_access: admin pode ver e gerenciar todos os acessos
DROP POLICY IF EXISTS "Admins can read all user_app_access" ON public.user_app_access;
CREATE POLICY "Admins can read all user_app_access" ON public.user_app_access
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all user_app_access" ON public.user_app_access;
CREATE POLICY "Admins can manage all user_app_access" ON public.user_app_access
  FOR ALL
  USING (public.is_admin());

-- Audit_logs: admin pode ver todos os logs (opcional)
DROP POLICY IF EXISTS "Admins can read all audit_logs" ON public.audit_logs;
CREATE POLICY "Admins can read all audit_logs" ON public.audit_logs
  FOR SELECT
  USING (public.is_admin());

/*
  Favoritos: usam a coluna is_favorite na tabela user_app_access (adicionada acima).
  Qualquer usuário autenticado pode inserir/atualizar seus próprios registros (user_id = auth.uid()).

  Se ainda não aparecer nenhum sistema:
  1) Confira se a tabela public.apps tem linhas (Table Editor → apps).
  2) Se a tabela tiver coluna "active", ela deve ser true para os sistemas que devem aparecer.
  3) Faça logout e login de novo após rodar este SQL.
*/
