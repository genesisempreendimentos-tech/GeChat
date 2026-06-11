-- Leads originados no CVCRM que ainda não existem em outra tabela-fonte do Neon
CREATE TABLE IF NOT EXISTS leads_cvcrm (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  nome                 TEXT NOT NULL,
  whatsapp             TEXT NOT NULL,
  email                TEXT,
  empreendimento       TEXT,
  canal                TEXT,
  updated_at           TIMESTAMPTZ,
  cvcrm_lead_id        TEXT,
  cvcrm_status         TEXT,
  cvcrm_situation      TEXT,
  cvcrm_stage          TEXT,
  cvcrm_is_sold        BOOLEAN,
  cvcrm_sale_value     NUMERIC,
  cvcrm_sale_date      TIMESTAMPTZ,
  cvcrm_last_update    TIMESTAMPTZ,
  cvcrm_payload        JSONB,
  cvcrm_sync_status    TEXT,
  cvcrm_last_synced_at TIMESTAMPTZ,
  codigo               TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_cvcrm_cvcrm_lead_id
  ON leads_cvcrm (cvcrm_lead_id)
  WHERE cvcrm_lead_id IS NOT NULL;
