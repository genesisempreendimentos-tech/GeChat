-- Espelha cvcrm_sync_status na tabela unificada lida pelo GeLeads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS cvcrm_sync_status TEXT DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS leads_cvcrm_sync_status_idx ON leads (cvcrm_sync_status);
