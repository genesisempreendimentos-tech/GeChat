/*
  GêLeads – Registro do app na tabela public.apps (auditoria + GeApps)
  Execute no Supabase: SQL Editor → New query → Run.
*/

INSERT INTO public.apps (name, slug, url, status, description)
SELECT
  'GêLeads',
  'geleads',
  'https://geleads.genesisapps.com.br',
  'ativo',
  'Plataforma de acompanhamento e gestão de leads'
WHERE NOT EXISTS (
  SELECT 1 FROM public.apps WHERE LOWER(TRIM(slug)) = 'geleads'
);
