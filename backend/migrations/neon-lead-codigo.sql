/*
  GêLeads – Coluna codigo (A0000, A0001, …) em todas as tabelas de leads (Neon)

  Execute no SQL Editor do Neon (mesmo banco de NEON_LEADS_DATABASE_URL).

  Regras:
  - Sequência GLOBAL única (não reinicia por empreendimento).
  - Ordenação do backfill: created_at ASC, depois id ASC.
  - Primeiro lead histórico → A0000, segundo → A0001, etc.
  - Tabela unificada `all_leads` recebe a numeração oficial.
  - Demais tabelas fonte recebem o mesmo codigo quando o id coincide.
  - Linhas só na fonte (sem espelho em `all_leads`) ganham número no final da fila.
*/

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Sequência global
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.all_leads_codigo_seq
  AS BIGINT
  START WITH 0
  INCREMENT BY 1
  MINVALUE 0
  NO MAXVALUE
  CACHE 1;

-- ---------------------------------------------------------------------------
-- 2) Coluna codigo em tabelas fonte (site_*, campanha_*, leads_*)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND (
        table_name LIKE 'leads%'
        OR table_name LIKE 'site_%'
        OR table_name LIKE 'campanha_%'
      )
      AND table_name NOT IN ('leads')
    ORDER BY table_name
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS codigo TEXT',
      tbl.table_name
    );
    EXECUTE format(
      'COMMENT ON COLUMN public.%I.codigo IS %L',
      tbl.table_name,
      'Identificador amigável sequencial (A0000, A0001, …)'
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Backfill na tabela unificada `all_leads`
-- ---------------------------------------------------------------------------
WITH numbered AS (
  SELECT
    id,
    'A' || lpad((row_number() OVER (ORDER BY created_at ASC NULLS LAST, id ASC) - 1)::text, 4, '0') AS new_codigo
  FROM public.all_leads
)
UPDATE public.all_leads AS l
SET codigo = n.new_codigo
FROM numbered AS n
WHERE l.id = n.id;

-- ---------------------------------------------------------------------------
-- 4) Propagar codigo para tabelas de origem (mesmo id)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND (
        table_name LIKE 'leads%'
        OR table_name LIKE 'site_%'
        OR table_name LIKE 'campanha_%'
      )
      AND table_name NOT IN ('leads')
      AND table_name <> 'all_leads'
    ORDER BY table_name
  LOOP
    EXECUTE format(
      $sql$
      UPDATE public.%1$I AS s
      SET codigo = l.codigo
      FROM public.all_leads AS l
      WHERE l.id = s.id
        AND l.codigo IS NOT NULL
      $sql$,
      tbl.table_name
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5) Linhas só nas fontes (sem registro em `all_leads`)
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _lead_codigo_orphans (
  table_name TEXT NOT NULL,
  id TEXT NOT NULL,
  created_at TIMESTAMPTZ,
  new_codigo TEXT,
  PRIMARY KEY (table_name, id)
) ON COMMIT DROP;

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND (
        table_name LIKE 'leads%'
        OR table_name LIKE 'site_%'
        OR table_name LIKE 'campanha_%'
      )
      AND table_name NOT IN ('leads')
      AND table_name <> 'all_leads'
    ORDER BY table_name
  LOOP
    EXECUTE format(
      $sql$
      INSERT INTO _lead_codigo_orphans (table_name, id, created_at)
      SELECT %1$L, s.id::text, s.created_at
      FROM public.%2$I AS s
      WHERE s.codigo IS NULL
      $sql$,
      tbl.table_name,
      tbl.table_name
    );
  END LOOP;
END $$;

WITH max_seq AS (
  SELECT COALESCE(MAX(substring(codigo FROM 2)::bigint), -1) AS last_n
  FROM public.all_leads
  WHERE codigo ~ '^A[0-9]+$'
),
numbered AS (
  SELECT
    o.table_name,
    o.id,
    'A' || lpad((m.last_n + row_number() OVER (ORDER BY o.created_at ASC NULLS LAST, o.table_name, o.id))::text, 4, '0') AS new_codigo
  FROM _lead_codigo_orphans AS o
  CROSS JOIN max_seq AS m
)
UPDATE _lead_codigo_orphans AS o
SET new_codigo = n.new_codigo
FROM numbered AS n
WHERE o.table_name = n.table_name
  AND o.id = n.id;

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT DISTINCT table_name FROM _lead_codigo_orphans
  LOOP
    EXECUTE format(
      $sql$
      UPDATE public.%1$I AS s
      SET codigo = o.new_codigo
      FROM _lead_codigo_orphans AS o
      WHERE o.table_name = %2$L
        AND o.id = s.id::text
        AND o.new_codigo IS NOT NULL
      $sql$,
      tbl.table_name,
      tbl.table_name
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 6) Ajusta sequência para o próximo INSERT automático
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl RECORD;
  max_n BIGINT := -1;
  n BIGINT;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND (
        table_name LIKE 'leads%'
        OR table_name LIKE 'site_%'
        OR table_name LIKE 'campanha_%'
      )
      AND table_name NOT IN ('leads')
  LOOP
    EXECUTE format(
      'SELECT COALESCE(MAX(substring(codigo FROM 2)::bigint), -1) FROM public.%I WHERE codigo ~ ''^A[0-9]+$''',
      tbl.table_name
    ) INTO n;
    IF n > max_n THEN
      max_n := n;
    END IF;
  END LOOP;

  PERFORM setval('public.all_leads_codigo_seq', max_n + 1, false);
END $$;

-- ---------------------------------------------------------------------------
-- 7) Índice / unicidade na tabela unificada
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS leads_codigo_uidx
  ON public.all_leads (codigo)
  WHERE codigo IS NOT NULL;

CREATE INDEX IF NOT EXISTS leads_codigo_idx
  ON public.all_leads (codigo);

-- ---------------------------------------------------------------------------
-- 8) Função + triggers para novos registros
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_lead_codigo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.codigo IS NULL OR btrim(NEW.codigo) = '' THEN
    NEW.codigo := 'A' || lpad(nextval('public.all_leads_codigo_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl RECORD;
  trg_name TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND (
        table_name LIKE 'leads%'
        OR table_name LIKE 'site_%'
        OR table_name LIKE 'campanha_%'
      )
      AND table_name NOT IN ('leads')
    ORDER BY table_name
  LOOP
    trg_name := tbl.table_name || '_assign_codigo_trg';
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', trg_name, tbl.table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.assign_lead_codigo()',
      trg_name,
      tbl.table_name
    );
  END LOOP;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- Conferência (opcional — rode depois do COMMIT)
-- ---------------------------------------------------------------------------
-- SELECT codigo, id, created_at, source_table FROM public.all_leads ORDER BY codigo LIMIT 10;
-- SELECT codigo, count(*) FROM public.all_leads GROUP BY 1 HAVING count(*) > 1;
-- SELECT 'all_leads' AS tbl, count(*) FILTER (WHERE codigo IS NULL) AS sem_codigo FROM public.all_leads;
