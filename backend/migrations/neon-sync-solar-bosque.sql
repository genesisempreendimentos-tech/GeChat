/*
  GêLeads – Exemplo: união pura site_solar_bosque → all_leads (Neon)
  Preferir syncLeadsFromSources({ force: true }) no backend.
*/

INSERT INTO all_leads (
  id, created_at, updated_at, name, email, phone, gender, birth_date, current_city,
  relationship_status, monthly_investment, profile_type, profile_completed,
  whatsapp_clicked, canal, empreendimento_interesse, parameter, children_status,
  codigo, cvcrm_lead_id, cvcrm_status, cvcrm_situation, cvcrm_stage, cvcrm_is_sold,
  cvcrm_sale_value, cvcrm_sale_date, cvcrm_last_update, cvcrm_payload,
  cvcrm_sync_status, cvcrm_sync_error, cvcrm_last_synced_at, source_table
)
SELECT
  s.id,
  s.created_at,
  COALESCE(s.updated_at, s.created_at),
  s.name,
  NULLIF(TRIM(s.email), ''),
  NULLIF(TRIM(s.phone), ''),
  NULLIF(TRIM(s.gender), ''),
  s.birth_date,
  NULLIF(TRIM(s.current_city), ''),
  NULLIF(TRIM(s.relationship_status), ''),
  NULLIF(TRIM(s.monthly_investment), ''),
  NULLIF(TRIM(s.profile_type), ''),
  COALESCE(s.profile_completed, false),
  COALESCE(s.whatsapp_clicked, false),
  NULLIF(TRIM(s.canal), ''),
  NULLIF(TRIM(s.empreendimento_interesse), ''),
  s.parameter,
  NULLIF(TRIM(s.children_status), ''),
  NULLIF(TRIM(s.codigo), ''),
  NULLIF(TRIM(s.cvcrm_lead_id), ''),
  NULLIF(TRIM(s.cvcrm_status), ''),
  NULLIF(TRIM(s.cvcrm_situation), ''),
  NULLIF(TRIM(s.cvcrm_stage), ''),
  COALESCE(s.cvcrm_is_sold, false),
  s.cvcrm_sale_value,
  s.cvcrm_sale_date,
  s.cvcrm_last_update,
  s.cvcrm_payload,
  COALESCE(NULLIF(TRIM(s.cvcrm_sync_status), ''), 'pending'),
  NULLIF(TRIM(s.cvcrm_sync_error), ''),
  s.cvcrm_last_synced_at,
  'site_solar_bosque'
FROM site_solar_bosque s;
