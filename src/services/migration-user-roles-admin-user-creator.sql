-- Legado / referência — mock UI no frontend.
-- Modelo alvo: admin | user | creator

-- 1) Papel legado manager vira user.
UPDATE public.profiles
SET role = 'user'
WHERE lower(trim(coalesce(role, ''))) = 'manager';

-- 2) Quem já tinha acesso ao painel admin por access_type vira admin no campo role.
UPDATE public.profiles
SET role = 'admin'
WHERE lower(trim(coalesce(access_type, ''))) IN ('softadmin', 'appsadmin');

-- 3) Normalização defensiva de valores inesperados.
UPDATE public.profiles
SET role = 'user'
WHERE lower(trim(coalesce(role, ''))) NOT IN ('admin', 'user', 'creator');

-- 4) Constraint de domínio para novos valores.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_role_valid_values'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_valid_values;
  END IF;
END $$;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_valid_values
CHECK (lower(trim(coalesce(role, ''))) IN ('admin', 'user', 'creator'));

-- 5) Auxílio para políticas RLS de comunicados: creator ou admin pode criar statement.
CREATE OR REPLACE FUNCTION public.is_creator_or_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE (p.user_id = auth.uid() OR p.id = auth.uid())
      AND lower(trim(coalesce(p.role, ''))) IN ('admin', 'creator')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_creator_or_admin() TO authenticated;
