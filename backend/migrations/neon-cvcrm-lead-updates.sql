-- Auditoria de alterações aplicadas pelo sync CVCRM → Neon
CREATE TABLE IF NOT EXISTS cvcrm_lead_updates (
  id            BIGSERIAL PRIMARY KEY,
  idlead        BIGINT NOT NULL,
  cvcrm_lead_id TEXT,
  lead_name     TEXT,
  source_table  TEXT,
  action        TEXT,
  changes       JSONB NOT NULL,
  synced_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cvcrm_lead_updates_synced_at
  ON cvcrm_lead_updates (synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_cvcrm_lead_updates_idlead
  ON cvcrm_lead_updates (idlead);
