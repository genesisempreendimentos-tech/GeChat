/*
  GEAPPS – Schema completo para Supabase
  
  Execute no Supabase: SQL Editor → New query → Cole → Run.
  Garante tabelas e colunas necessárias para o painel admin e evita 400 em PATCH/GET.
*/

-- ========== TABELA apps ==========
-- Garantir que a tabela apps exista com as colunas esperadas (ajuste se sua tabela já existir com outro nome)

-- Coluna status (TEXT, sem CHECK restritivo para aceitar ativo, beta, rascunho, arquivado, excluído)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'apps' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.apps ADD COLUMN status TEXT DEFAULT 'rascunho';
  END IF;
END $$;

-- Remover CHECK antigo em status se existir (permite valor 'excluído')
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'apps' AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%status%'
  ) LOOP
    EXECUTE format('ALTER TABLE public.apps DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.apps ALTER COLUMN status SET DEFAULT 'rascunho';

-- Colunas opcionais em apps (se não existirem)
ALTER TABLE public.apps ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.apps ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.apps ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE public.apps ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.apps ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.apps ADD COLUMN IF NOT EXISTS icon_url TEXT;
ALTER TABLE public.apps ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ========== TABELA profiles ==========
-- Colunas usadas pela busca de colaboradores e pelo app
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS access_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ========== TABELA user_app_access ==========
ALTER TABLE public.user_app_access ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.user_app_access ADD COLUMN IF NOT EXISTS app_id UUID;
ALTER TABLE public.user_app_access ADD COLUMN IF NOT EXISTS access boolean NOT NULL DEFAULT true;
ALTER TABLE public.user_app_access ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_app_access ADD COLUMN IF NOT EXISTS access_type TEXT;

-- Constraint única para upsert (ajuste os nomes se sua tabela já tiver)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_app_access'::regclass
      AND conname LIKE '%user_id%' AND conname LIKE '%app_id%'
  ) THEN
    ALTER TABLE public.user_app_access
      ADD CONSTRAINT user_app_access_user_app_unique UNIQUE (user_id, app_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========== RLS e políticas (resumo) ==========
-- Habilitar RLS nas tabelas
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_app_access ENABLE ROW LEVEL SECURITY;

-- Função is_admin (se não existir)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE (user_id = auth.uid() OR id = auth.uid()) AND LOWER(TRIM(COALESCE(role,''))) = 'admin'); $$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Função is_softadmin
CREATE OR REPLACE FUNCTION public.is_softadmin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE (user_id = auth.uid() OR id = auth.uid()) AND LOWER(TRIM(COALESCE(access_type, ''))) = 'softadmin'); $$;
GRANT EXECUTE ON FUNCTION public.is_softadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_softadmin() TO service_role;

-- Políticas apps: SELECT para todos autenticados (ou restrito por status/acesso conforme sua regra)
DROP POLICY IF EXISTS "Apps select by role or access" ON public.apps;
CREATE POLICY "Apps select by role or access"
  ON public.apps FOR SELECT TO authenticated
  USING (
    public.is_admin() OR public.is_softadmin()
    OR (LOWER(TRIM(COALESCE(status,''))) IN ('ativo','beta')
        AND EXISTS (SELECT 1 FROM public.user_app_access ua WHERE ua.app_id = apps.id AND ua.user_id = auth.uid() AND (ua.access = true OR ua.access IS NULL)))
  );

DROP POLICY IF EXISTS "Apps manage by admin or softadmin" ON public.apps;
CREATE POLICY "Apps manage by admin or softadmin"
  ON public.apps FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_softadmin())
  WITH CHECK (public.is_admin() OR public.is_softadmin());

-- Políticas user_app_access
DROP POLICY IF EXISTS "user_app_access select by admin or softadmin" ON public.user_app_access;
CREATE POLICY "user_app_access select by admin or softadmin"
  ON public.user_app_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin() OR public.is_softadmin());

DROP POLICY IF EXISTS "user_app_access manage by admin or softadmin" ON public.user_app_access;
CREATE POLICY "user_app_access manage by admin or softadmin"
  ON public.user_app_access FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin() OR public.is_softadmin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin() OR public.is_softadmin());

-- Políticas profiles: usuário lê o próprio; admin/softadmin leem todos
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin and softadmin can read all profiles" ON public.profiles;
CREATE POLICY "Profiles select own or admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    (user_id = auth.uid() OR id = auth.uid())
    OR public.is_admin()
    OR public.is_softadmin()
  );
