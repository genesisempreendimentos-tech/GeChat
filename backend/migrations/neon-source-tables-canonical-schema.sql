/*
  GêLeads — Padroniza as 14 tabelas-fonte para o schema canônico.

  Execute no SQL Editor do Neon (NEON_LEADS_DATABASE_URL).

  INSPEÇÃO PRÉVIA (2026-06-15) — leads_antigos datas:
    nascimento (bigint/texto ano): "1998", "1994", "1993", "2000", "1957"…
    birth_date (text): "09/04/1998", "19/01/1994", "1990-05-03", "09/16/1976"…
    → nascimento parece ANO DE NASCIMENTO; birth_date mistura DD/MM/YYYY e ISO.
    → Seção 8 (conversão birth_date/nascimento em leads_antigos) FICA COMENTADA
      até confirmação da regra de conversão.

  COLUNAS NÃO-CANÔNICAS MANTIDAS (aguardam seu OK antes de DROP):
    - site_oasis_ii.children_status (4 linhas)
    - leads_antigos.nascimento (até regra de conversão para birth_date DATE)

  Tabelas: campanha_niver_208_anos_friburgo, campanha_blackgenesis, site_flow,
  site_gesite, site_kastell, site_nature, site_oasis_i, site_oasis_ii, leads_antigos,
  site_solar_bellavista, site_solar_bosque, site_solar_flores, site_vita, leads_cvcrm
*/

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Função auxiliar: adiciona colunas canônicas ausentes (idempotente)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_source_canonical_columns(p_table regclass)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  t text := p_table::text;
BEGIN
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS gender TEXT', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS birth_date DATE', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS current_city TEXT', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS relationship_status TEXT', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS monthly_investment TEXT', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS profile_type TEXT', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS whatsapp_clicked BOOLEAN DEFAULT false', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS canal TEXT', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS empreendimento_interesse TEXT', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS parameter TEXT[]', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS codigo TEXT', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS cvcrm_lead_id TEXT', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS cvcrm_status TEXT', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS cvcrm_situation TEXT', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS cvcrm_stage TEXT', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS cvcrm_is_sold BOOLEAN DEFAULT false', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS cvcrm_sale_value NUMERIC', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS cvcrm_sale_date TIMESTAMPTZ', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS cvcrm_last_update TIMESTAMPTZ', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS cvcrm_payload JSONB', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS cvcrm_sync_status TEXT', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS cvcrm_sync_error TEXT', p_table);
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS cvcrm_last_synced_at TIMESTAMPTZ', p_table);
END;
$$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'campanha_niver_208_anos_friburgo',
    'campanha_blackgenesis',
    'site_flow',
    'site_gesite',
    'site_kastell',
    'site_nature',
    'site_oasis_i',
    'site_oasis_ii',
    'leads_antigos',
    'site_solar_bellavista',
    'site_solar_bosque',
    'site_solar_flores',
    'site_vita',
    'leads_cvcrm'
  ]
  LOOP
    PERFORM public.ensure_source_canonical_columns(tbl::regclass);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 1) GLOBAL: empreendimento → empreendimento_interesse
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'campanha_niver_208_anos_friburgo',
    'campanha_blackgenesis',
    'site_flow',
    'site_gesite',
    'site_kastell',
    'site_nature',
    'site_oasis_i',
    'site_oasis_ii',
    'leads_antigos',
    'site_solar_bellavista',
    'site_solar_bosque',
    'site_solar_flores',
    'site_vita',
    'leads_cvcrm'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'empreendimento'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'empreendimento_interesse'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME COLUMN empreendimento TO empreendimento_interesse', tbl);
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'empreendimento'
    ) THEN
      EXECUTE format(
        'UPDATE public.%I SET empreendimento_interesse = COALESCE(NULLIF(TRIM(empreendimento_interesse), ''''), NULLIF(TRIM(empreendimento), ''''))',
        tbl
      );
      EXECUTE format('ALTER TABLE public.%I DROP COLUMN empreendimento', tbl);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2) RENAMES: sexo → gender
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'campanha_niver_208_anos_friburgo',
    'site_nature',
    'site_oasis_i',
    'site_solar_bellavista',
    'site_solar_flores'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'sexo'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME COLUMN sexo TO gender', tbl);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3) RENAMES: nome → name, whatsapp → phone (leads_cvcrm, site_solar_bosque)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads_cvcrm' AND column_name = 'nome'
  ) THEN
    ALTER TABLE public.leads_cvcrm RENAME COLUMN nome TO name;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads_cvcrm' AND column_name = 'whatsapp'
  ) THEN
    ALTER TABLE public.leads_cvcrm RENAME COLUMN whatsapp TO phone;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'site_solar_bosque' AND column_name = 'nome'
  ) THEN
    ALTER TABLE public.site_solar_bosque RENAME COLUMN nome TO name;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'site_solar_bosque' AND column_name = 'whatsapp'
  ) THEN
    ALTER TABLE public.site_solar_bosque RENAME COLUMN whatsapp TO phone;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4) MERGE interesse → empreendimento_interesse + DROP interesse
-- ---------------------------------------------------------------------------
UPDATE public.leads_antigos
SET empreendimento_interesse = COALESCE(
  NULLIF(TRIM(empreendimento_interesse), ''),
  NULLIF(TRIM(interesse), '')
)
WHERE interesse IS NOT NULL;

UPDATE public.site_solar_bosque
SET empreendimento_interesse = COALESCE(
  NULLIF(TRIM(empreendimento_interesse), ''),
  NULLIF(TRIM(interesse), '')
)
WHERE interesse IS NOT NULL;

ALTER TABLE public.leads_antigos DROP COLUMN IF EXISTS interesse;
ALTER TABLE public.site_solar_bosque DROP COLUMN IF EXISTS interesse;

-- ---------------------------------------------------------------------------
-- 5) MERGE ormetain → canal + DROP (leads_antigos)
-- ---------------------------------------------------------------------------
UPDATE public.leads_antigos
SET canal = COALESCE(NULLIF(TRIM(canal), ''), NULLIF(TRIM(ormetain), ''))
WHERE ormetain IS NOT NULL;

ALTER TABLE public.leads_antigos DROP COLUMN IF EXISTS ormetain;

-- ---------------------------------------------------------------------------
-- 6) MERGE completed → profile_completed + DROP (site_solar_bosque)
-- ---------------------------------------------------------------------------
UPDATE public.site_solar_bosque
SET profile_completed = COALESCE(profile_completed, completed, false)
WHERE completed IS NOT NULL;

ALTER TABLE public.site_solar_bosque DROP COLUMN IF EXISTS completed;

-- ---------------------------------------------------------------------------
-- 7) MERGE data_entrada → created_at + DROP (leads_antigos)
--     Formato observado: "DD/MM/YYYY | HH:MM"
-- ---------------------------------------------------------------------------
UPDATE public.leads_antigos
SET created_at = COALESCE(
  created_at,
  to_timestamp(data_entrada, 'DD/MM/YYYY | HH24:MI') AT TIME ZONE 'America/Sao_Paulo'
)
WHERE created_at IS NULL
  AND data_entrada IS NOT NULL
  AND data_entrada ~ '^\d{2}/\d{2}/\d{4}\s*\|\s*\d{2}:\d{2}$';

ALTER TABLE public.leads_antigos DROP COLUMN IF EXISTS data_entrada;

-- ---------------------------------------------------------------------------
-- 8) DROP lixo (leads_antigos) — NÃO inclui nascimento (aguarda regra)
-- ---------------------------------------------------------------------------
ALTER TABLE public.leads_antigos DROP COLUMN IF EXISTS emoji;
ALTER TABLE public.leads_antigos DROP COLUMN IF EXISTS pontos;
ALTER TABLE public.leads_antigos DROP COLUMN IF EXISTS idade;

-- ---------------------------------------------------------------------------
-- 9) leads_antigos birth_date / nascimento — AGUARDANDO CONFIRMAÇÃO (não executar)
-- ---------------------------------------------------------------------------
/*
-- Amostra inspecionada:
--   nascimento: "1998", "1994", "1993" (ano)
--   birth_date: "09/04/1998", "1990-05-03", "09/16/1976" (DD/MM/YYYY ou ISO)
--
-- Após confirmar regra, descomente e ajuste:
--
-- UPDATE public.leads_antigos SET birth_date = ... FROM nascimento WHERE ...
-- ALTER TABLE public.leads_antigos DROP COLUMN IF EXISTS nascimento;
-- ALTER TABLE public.leads_antigos ALTER COLUMN birth_date TYPE DATE USING ...;
*/

-- ---------------------------------------------------------------------------
-- 10) Relatório: birth_date text em leads_antigos (não convertido)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  bad_count int;
BEGIN
  SELECT COUNT(*)::int INTO bad_count
  FROM public.leads_antigos
  WHERE birth_date IS NOT NULL
    AND birth_date::text !~ '^\d{4}-\d{2}-\d{2}$'
    AND birth_date::text !~ '^\d{2}/\d{2}/\d{4}$'
    AND birth_date::text !~ '^\d{2}/\d{2}/\d{4}$';
  RAISE NOTICE 'leads_antigos: birth_date ainda TEXT com % linha(s) — conversão pendente', bad_count;
END $$;

-- ---------------------------------------------------------------------------
-- 11) Garantir NOT NULL apenas onde já era NOT NULL (não forçar email em cvcrm/antigos)
-- ---------------------------------------------------------------------------
-- leads_cvcrm.name e phone: manter NOT NULL se já existir constraint; email permanece nullable.

COMMIT;

-- ---------------------------------------------------------------------------
-- Conferência pós-migration (opcional)
-- ---------------------------------------------------------------------------
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name IN (
--     'campanha_niver_208_anos_friburgo','campanha_blackgenesis','site_flow','site_gesite',
--     'site_kastell','site_nature','site_oasis_i','site_oasis_ii','leads_antigos',
--     'site_solar_bellavista','site_solar_bosque','site_solar_flores','site_vita','leads_cvcrm'
--   )
-- ORDER BY table_name, ordinal_position;
