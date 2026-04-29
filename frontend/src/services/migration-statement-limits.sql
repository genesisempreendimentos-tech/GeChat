-- Legado — limites de comunicados (referência).
-- Executar no SQL Editor do Supabase após garantir que os dados existentes respeitam os limites
-- (ou ajustar títulos/legendas/comentários longos antes de aplicar).

-- Tamanhos de texto
ALTER TABLE public.statement
  DROP CONSTRAINT IF EXISTS statement_title_length_chk;
ALTER TABLE public.statement
  ADD CONSTRAINT statement_title_length_chk CHECK (char_length(title) <= 100);

ALTER TABLE public.statement
  DROP CONSTRAINT IF EXISTS statement_caption_length_chk;
ALTER TABLE public.statement
  ADD CONSTRAINT statement_caption_length_chk CHECK (caption IS NULL OR char_length(caption) <= 3000);

ALTER TABLE public.statement_comment
  DROP CONSTRAINT IF EXISTS statement_comment_content_length_chk;
ALTER TABLE public.statement_comment
  ADD CONSTRAINT statement_comment_content_length_chk CHECK (char_length(content) <= 1000);

-- No máximo 200 comentários ativos por comunicado (antes do INSERT a linha nova ainda não conta)
CREATE OR REPLACE FUNCTION public.statement_comment_enforce_max_per_post()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  n integer;
BEGIN
  SELECT count(*)::integer INTO n
  FROM public.statement_comment
  WHERE statement_id = NEW.statement_id
    AND is_active = true
    AND deleted_at IS NULL;

  IF n >= 200 THEN
    RAISE EXCEPTION 'Limite de 200 comentários por comunicado atingido.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_statement_comment_limit ON public.statement_comment;
CREATE TRIGGER trg_statement_comment_limit
  BEFORE INSERT ON public.statement_comment
  FOR EACH ROW
  EXECUTE PROCEDURE public.statement_comment_enforce_max_per_post();
