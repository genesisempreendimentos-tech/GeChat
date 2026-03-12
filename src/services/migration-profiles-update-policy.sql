/*
  GEAPPS – Política UPDATE em profiles (evita 406 Not Acceptable no PATCH)
  
  O 406 ocorre porque, com RLS ativo, só existia política SELECT.
  Sem política UPDATE, o PATCH é negado e o PostgREST não consegue retornar a linha.
  
  Execute no Supabase: SQL Editor → New query → Cole → Run.
*/

-- Usuário autenticado pode atualizar o próprio perfil (por user_id ou id)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR id = auth.uid())
  WITH CHECK (user_id = auth.uid() OR id = auth.uid());
