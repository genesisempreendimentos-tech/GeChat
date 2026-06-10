/*
  GêLeads – Schema de leads no Neon (Postgres)
  Execute no console SQL do Neon. Supabase permanece apenas para autenticação.
*/

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT,
  source_table TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  page TEXT,
  origem TEXT,
  canal TEXT,
  parametro TEXT,
  empreendimento TEXT,
  responsavel TEXT,
  relacionamento TEXT,
  investimento TEXT,
  cidade_residencia TEXT,
  birth_date TEXT,
  profile_type TEXT,
  profile_notes TEXT,
  dispositivo TEXT,
  pagamento_preferencia TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  cvcrm_lead_id TEXT,
  cvcrm_sync_status TEXT DEFAULT 'pending',
  cvcrm_is_sold BOOLEAN DEFAULT false,
  cvcrm_status TEXT,
  cvcrm_situation TEXT,
  cvcrm_stage TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);
CREATE INDEX IF NOT EXISTS leads_origem_idx ON leads (origem);
CREATE INDEX IF NOT EXISTS leads_page_idx ON leads (page);
