-- NULL ou vazio em empreendimento_interesse passa a ser o texto 'Null' (legível / classificável).

-- all_leads (união)
UPDATE public.all_leads
SET empreendimento_interesse = 'Null'
WHERE empreendimento_interesse IS NULL
   OR TRIM(empreendimento_interesse) = '';

-- Tabelas-fonte (schema canônico)
DO $$
DECLARE
  tbl TEXT;
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
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'empreendimento_interesse'
    ) THEN
      EXECUTE format(
        $q$UPDATE public.%I SET empreendimento_interesse = 'Null'
          WHERE empreendimento_interesse IS NULL OR TRIM(empreendimento_interesse) = ''$q$,
        tbl
      );
    END IF;
  END LOOP;
END $$;
