/*
  Colunas esperadas na tabela public.profiles pelo GêApps
  
  O projeto usa as tabelas do seu Supabase:
  - profiles (usuários) – convenção: full_name, avatar_url; o app aceita name/avatar como fallback
  - apps (sistemas/aplicações) – mesmas colunas que "systems": name, description, icon, url, category, active
  - user_app_access – user_id, app_id, can_access, is_favorite (ou favorite)
  - audit_logs – user_id, app_id, timestamp (ou created_at)
  
  Se a tabela profiles já existe, execute os ALTERs abaixo para adicionar as colunas que faltam.
*/

-- Adicionar colunas que podem estar faltando (ignore erros "column already exists")
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Colunas da aba Perfil (apelido, username, bio, ícone, redes)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS apelido TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date TEXT;

-- Comentário: o app usa full_name -> name, avatar_url -> avatar; salva/carrega apelido, username, bio, icon, linkedin, instagram, whatsapp.
