/*
  GêLeads – all_leads_unique (1 linha por PESSOA)
  Populada pelo backend: rebuildAllLeadsUnique() após cada consolidação.
*/

CREATE TABLE IF NOT EXISTS all_leads_unique (
  person_id UUID PRIMARY KEY,
  name TEXT[] NOT NULL DEFAULT '{}',
  email TEXT[] NOT NULL DEFAULT '{}',
  phone TEXT[] NOT NULL DEFAULT '{}',
  empreendimento_interesse TEXT[] NOT NULL DEFAULT '{}',
  canal TEXT[] NOT NULL DEFAULT '{}',
  source_table TEXT[] NOT NULL DEFAULT '{}',
  parameter TEXT[] NOT NULL DEFAULT '{}',
  birth_date DATE,
  gender TEXT,
  current_city TEXT,
  relationship_status TEXT,
  monthly_investment TEXT,
  profile_type TEXT,
  profile_completed BOOLEAN,
  whatsapp_clicked BOOLEAN,
  children_status TEXT,
  cvcrm_lead_id TEXT,
  cvcrm_status TEXT,
  cvcrm_situation TEXT,
  cvcrm_stage TEXT,
  cvcrm_is_sold BOOLEAN,
  cvcrm_sale_value NUMERIC,
  cvcrm_sale_date TIMESTAMPTZ,
  cvcrm_last_update TIMESTAMPTZ,
  idcorretor TEXT,
  idimobiliaria TEXT,
  signup_count INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS all_leads_unique_created_at_idx ON all_leads_unique (created_at DESC);
CREATE INDEX IF NOT EXISTS all_leads_unique_cvcrm_lead_id_idx ON all_leads_unique (cvcrm_lead_id);
