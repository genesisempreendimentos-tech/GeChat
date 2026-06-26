/*
  GECHAT – Appsadmin pode atualizar access_type em profiles

  Permite que usuários com access_type = 'appsadmin' (ou admin/softadmin)
  atualizem a coluna access_type de qualquer perfil (promover a appsadmin ou rebaixar a member).

  Execute no Supabase: SQL Editor → New query → Cole → Run.
*/

-- Política: admin, softadmin ou appsadmin podem atualizar qualquer profile (ex.: access_type)
DROP POLICY IF EXISTS "Admin or appsadmin can update any profile" ON public.profiles;
CREATE POLICY "Admin or appsadmin can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin() = true OR public.is_softadmin() = true OR public.is_appsadmin() = true)
  WITH CHECK (true);
