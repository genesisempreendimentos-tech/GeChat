-- GêApps – coluna `profiles.sidebar` (modo da sidebar na UI)
-- Valores: hover (padrão) | expanded | collapsed

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sidebar TEXT NOT NULL DEFAULT 'hover'
    CHECK (sidebar IN ('hover', 'expanded', 'collapsed'));

COMMENT ON COLUMN public.profiles.sidebar IS 'Modo da sidebar: hover | expanded | collapsed';
