/*
  GêLeads – Citações aleatórias no topbar
  Execute no SQL Editor do Supabase.
*/

CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  frase text NOT NULL,
  autor text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT quotes_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quotes_select_authenticated ON public.quotes;
CREATE POLICY quotes_select_authenticated
  ON public.quotes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.random_quote()
RETURNS SETOF public.quotes
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.quotes
  ORDER BY random()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.random_quote() TO authenticated;

INSERT INTO public.quotes (frase, autor)
SELECT v.frase, v.autor
FROM (
  VALUES
    ('O sucesso é a soma de pequenos esforços repetidos dia após dia.', 'Robert Collier'),
    ('Não espere por oportunidades extraordinárias. Agarre ocasiões comuns e faça-as grandes.', 'Orison Swett Marden'),
    ('A persistência é o caminho do êxito.', 'Charles Chaplin'),
    ('O cliente não compra um produto; compra a solução de um problema.', 'Theodore Levitt'),
    ('Vender é sobre construir relacionamentos, não apenas fechar negócios.', 'Zig Ziglar'),
    ('A melhor publicidade é a feita por clientes satisfeitos.', 'Philip Kotler'),
    ('Se você não está disposto a arriscar, esteja disposto a uma vida comum.', 'Jim Rohn'),
    ('Metas são sonhos com prazo.', 'Diana Scharf Hunt')
) AS v(frase, autor)
WHERE NOT EXISTS (SELECT 1 FROM public.quotes LIMIT 1);
