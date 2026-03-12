/*
  Migração: status dos apps (ativo/beta/rascunho/arquivado) e visibilidade para membros
  
  Execute no Supabase: SQL Editor → New query → Cole → Run.
  
  - Coluna status na tabela apps (texto: ativo, beta, rascunho, arquivado).
  - Softadmin (access_type = 'softadmin' em profiles) pode gerenciar apps.
  - Membros só veem apps com status ativo/beta E com acesso liberado em user_app_access (access = true).
*/

-- 1) Coluna status em apps (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'apps' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.apps ADD COLUMN status TEXT DEFAULT 'rascunho';
  END IF;
END $$;

-- Migrar valores antigos: active -> ativo, inactive -> arquivado
UPDATE public.apps
SET status = CASE
  WHEN status IN ('active', 'inactive') THEN CASE status WHEN 'active' THEN 'ativo' ELSE 'arquivado' END
  WHEN status IS NULL OR status = '' THEN 'rascunho'
  ELSE status
END
WHERE status IS NULL OR status IN ('active', 'inactive', '');

-- Garantir que status tenha valor padrão
ALTER TABLE public.apps ALTER COLUMN status SET DEFAULT 'rascunho';

-- 2) Coluna access em user_app_access (liberação explícita para membros)
ALTER TABLE public.user_app_access
  ADD COLUMN IF NOT EXISTS access boolean NOT NULL DEFAULT true;

-- 3) Função: usuário é softadmin (access_type = 'softadmin' em profiles)
CREATE OR REPLACE FUNCTION public.is_softadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (user_id = auth.uid() OR id = auth.uid())
      AND LOWER(TRIM(COALESCE(access_type, ''))) = 'softadmin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_softadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_softadmin() TO service_role;

-- 4) Apps: SELECT - softadmin/admin veem todos; membros só veem ativo/beta com acesso liberado
DROP POLICY IF EXISTS "Authenticated can read apps" ON public.apps;
DROP POLICY IF EXISTS "Admins can read all apps" ON public.apps;

CREATE POLICY "Apps select by role or access"
  ON public.apps FOR SELECT TO authenticated
  USING (
    public.is_admin() = true
    OR public.is_softadmin() = true
    OR (
      LOWER(TRIM(COALESCE(status, ''))) IN ('ativo', 'beta')
      AND EXISTS (
        SELECT 1 FROM public.user_app_access ua
        WHERE ua.app_id = apps.id
          AND ua.user_id = auth.uid()
          AND (ua.access = true OR ua.access IS NULL)
      )
    )
  );

-- 5) Apps: INSERT/UPDATE/DELETE - apenas admin ou softadmin
DROP POLICY IF EXISTS "Admins can manage all apps" ON public.apps;

CREATE POLICY "Apps manage by admin or softadmin"
  ON public.apps FOR ALL TO authenticated
  USING (public.is_admin() = true OR public.is_softadmin() = true)
  WITH CHECK (public.is_admin() = true OR public.is_softadmin() = true);

-- 6) user_app_access: softadmin pode gerenciar todos (liberar acesso para membros)
DROP POLICY IF EXISTS "Admins can read all user_app_access" ON public.user_app_access;
DROP POLICY IF EXISTS "Admins can manage all user_app_access" ON public.user_app_access;

CREATE POLICY "user_app_access select by admin or softadmin"
  ON public.user_app_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin() = true OR public.is_softadmin() = true);

CREATE POLICY "user_app_access manage by admin or softadmin"
  ON public.user_app_access FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin() = true OR public.is_softadmin() = true)
  WITH CHECK (user_id = auth.uid() OR public.is_admin() = true OR public.is_softadmin() = true);
