-- Legado — profile_status em profiles (referência)
-- Execute no SQL Editor do Supabase se a coluna ainda não existir.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_status TEXT DEFAULT 'active';

COMMENT ON COLUMN public.profiles.profile_status IS 'active | archived | deleted — excluído = soft delete no painel admin.';
