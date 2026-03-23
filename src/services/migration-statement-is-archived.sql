-- Comunicados: soft-archive (oculta do feed principal quando true).
ALTER TABLE public.statement
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.statement.is_archived IS 'true = arquivado (oculto do feed; visível só para quem tiver política de UPDATE).';
