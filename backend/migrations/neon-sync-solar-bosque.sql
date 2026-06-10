/*
  GêLeads – Sincroniza leads_solar_bosque → leads (Neon)
  Execute após neon-leads.sql no mesmo banco Neon.
*/

INSERT INTO leads (
  id,
  source_table,
  name,
  email,
  phone,
  page,
  origem,
  canal,
  parametro,
  empreendimento,
  relacionamento,
  investimento,
  cidade_residencia,
  birth_date,
  profile_type,
  profile_notes,
  status,
  cvcrm_lead_id,
  created_at,
  updated_at
)
SELECT
  s.id,
  'leads_solar_bosque',
  s.nome,
  NULLIF(TRIM(s.email), ''),
  NULLIF(TRIM(s.whatsapp), ''),
  COALESCE(NULLIF(TRIM(s.interesse), ''), '/solar-do-bosque'),
  CASE
    WHEN NULLIF(TRIM(s.canal), '') IS NULL THEN 'Direto'
    WHEN LOWER(TRIM(s.canal)) = 'site' THEN 'Direto'
    ELSE TRIM(s.canal)
  END,
  COALESCE(NULLIF(TRIM(s.canal), ''), 'Site'),
  COALESCE(NULLIF(TRIM(s.interesse), ''), COALESCE(NULLIF(TRIM(s.empreendimento), ''), 'Solar do Bosque')),
  COALESCE(NULLIF(TRIM(s.empreendimento), ''), 'Solar do Bosque'),
  NULLIF(TRIM(s.relationship_status), ''),
  NULLIF(TRIM(s.monthly_investment), ''),
  NULLIF(TRIM(s.current_city), ''),
  CASE
    WHEN s.birth_date IS NULL THEN NULL
    ELSE to_char(s.birth_date AT TIME ZONE 'UTC', 'DD/MM/YYYY')
  END,
  NULLIF(TRIM(s.profile_type), ''),
  NULLIF(TRIM(s.interesse), ''),
  CASE
    WHEN s.cvcrm_is_sold THEN 'ganho'
    WHEN s.profile_completed OR s.completed THEN 'qualificado'
    ELSE 'novo'
  END,
  NULLIF(TRIM(s.cvcrm_lead_id), ''),
  s.created_at,
  COALESCE(s.updated_at, s.created_at)
FROM leads_solar_bosque s
ON CONFLICT (id) DO UPDATE SET
  source_table = EXCLUDED.source_table,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  page = EXCLUDED.page,
  origem = EXCLUDED.origem,
  canal = EXCLUDED.canal,
  parametro = EXCLUDED.parametro,
  empreendimento = EXCLUDED.empreendimento,
  relacionamento = EXCLUDED.relacionamento,
  investimento = EXCLUDED.investimento,
  cidade_residencia = EXCLUDED.cidade_residencia,
  birth_date = EXCLUDED.birth_date,
  profile_type = EXCLUDED.profile_type,
  profile_notes = EXCLUDED.profile_notes,
  status = EXCLUDED.status,
  cvcrm_lead_id = EXCLUDED.cvcrm_lead_id,
  updated_at = EXCLUDED.updated_at;
