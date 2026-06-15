-- Leads originados no CVCRM que ainda não existem em outra tabela-fonte do Neon
-- Schema canônico alinhado com neon-source-tables-canonical-schema.sql
CREATE TABLE IF NOT EXISTS leads_cvcrm (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now(),
  name                     TEXT NOT NULL,
  email                    TEXT,
  phone                    TEXT NOT NULL,
  gender                   TEXT,
  birth_date               DATE,
  current_city             TEXT,
  relationship_status      TEXT,
  monthly_investment       TEXT,
  profile_type             TEXT,
  profile_completed        BOOLEAN DEFAULT false,
  whatsapp_clicked         BOOLEAN DEFAULT false,
  canal                    TEXT,
  empreendimento_interesse TEXT,
  parameter                TEXT[],
  codigo                   TEXT,
  cvcrm_lead_id            TEXT,
  cvcrm_status             TEXT,
  cvcrm_situation          TEXT,
  cvcrm_stage              TEXT,
  cvcrm_is_sold            BOOLEAN DEFAULT false,
  cvcrm_sale_value         NUMERIC,
  cvcrm_sale_date          TIMESTAMPTZ,
  cvcrm_last_update        TIMESTAMPTZ,
  cvcrm_payload            JSONB,
  cvcrm_sync_status        TEXT,
  cvcrm_sync_error         TEXT,
  cvcrm_last_synced_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_cvcrm_cvcrm_lead_id
  ON leads_cvcrm (cvcrm_lead_id)
  WHERE cvcrm_lead_id IS NOT NULL;
