-- Cursors de sync incremental CVCRM (UTC); filtro CVDW usa BRT via brtTimestamp()

CREATE TABLE IF NOT EXISTS cvcrm_sync_cursors (
  entity        TEXT PRIMARY KEY,
  last_sync_at  TIMESTAMPTZ
);

INSERT INTO cvcrm_sync_cursors (entity) VALUES ('leads'), ('reservas')
ON CONFLICT (entity) DO NOTHING;
