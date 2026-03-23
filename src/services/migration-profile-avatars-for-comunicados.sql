-- Avatares para comunicados: leitura de avatar_url por id/user_id sem expor toda a tabela
-- (contorna RLS de profiles quando só o próprio utilizador pode SELECT).
-- Executar no Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.profile_avatars_for_ids(ids uuid[])
RETURNS TABLE (lookup_key uuid, avatar_url text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.id AS lookup_key, NULLIF(trim(p.avatar_url::text), '')::text AS avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(ids)
    AND NULLIF(trim(p.avatar_url::text), '') IS NOT NULL
  UNION
  SELECT p.user_id AS lookup_key, NULLIF(trim(p.avatar_url::text), '')::text AS avatar_url
  FROM public.profiles p
  WHERE p.user_id IS NOT NULL
    AND p.user_id = ANY(ids)
    AND NULLIF(trim(p.avatar_url::text), '') IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.profile_avatars_for_ids(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_avatars_for_ids(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.profile_avatars_for_ids(uuid[]) IS
  'Retorna avatar_url (coluna profiles.avatar_url) por profiles.id ou profiles.user_id — uso na UI de comunicados.';
