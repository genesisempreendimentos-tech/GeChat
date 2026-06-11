-- Último sync em lote CVCRM → Neon (uma linha singleton)
CREATE TABLE IF NOT EXISTS cvcrm_sync_status (
  id             INT PRIMARY KEY DEFAULT 1,
  last_sync_at   TIMESTAMPTZ,
  last_processed INT DEFAULT 0,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO cvcrm_sync_status (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
