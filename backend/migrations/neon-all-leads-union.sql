/*
  GêLeads – all_leads = união pura (sem dedup por codigo)
  Execute no SQL Editor do Neon após neon-source-tables-canonical-schema.sql
*/

DROP INDEX IF EXISTS public.leads_codigo_uidx;

-- Recria all_leads com schema canônico + source_table (duplicados permitidos)
DROP TABLE IF EXISTS public.all_leads;

CREATE TABLE public.all_leads (
  id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  gender TEXT,
  birth_date DATE,
  current_city TEXT,
  relationship_status TEXT,
  monthly_investment TEXT,
  profile_type TEXT,
  profile_completed BOOLEAN DEFAULT false,
  whatsapp_clicked BOOLEAN DEFAULT false,
  canal TEXT,
  empreendimento_interesse TEXT,
  parameter TEXT[],
  children_status TEXT,
  codigo TEXT,
  cvcrm_lead_id TEXT,
  cvcrm_status TEXT,
  cvcrm_situation TEXT,
  cvcrm_stage TEXT,
  cvcrm_is_sold BOOLEAN DEFAULT false,
  cvcrm_sale_value NUMERIC,
  cvcrm_sale_date TIMESTAMPTZ,
  cvcrm_last_update TIMESTAMPTZ,
  cvcrm_payload JSONB,
  cvcrm_sync_status TEXT DEFAULT 'pending',
  cvcrm_sync_error TEXT,
  cvcrm_last_synced_at TIMESTAMPTZ,
  source_table TEXT NOT NULL,
  PRIMARY KEY (id, source_table)
);

CREATE INDEX all_leads_created_at_idx ON all_leads (created_at DESC);
CREATE INDEX all_leads_source_table_idx ON all_leads (source_table);
CREATE INDEX all_leads_codigo_idx ON all_leads (codigo);

-- Repovoar via backend: syncLeadsFromSources({ force: true })
