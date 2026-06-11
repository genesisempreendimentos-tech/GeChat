-- Fila de leads CVCRM aguardando sincronização em lote (webhook → batch sync)
CREATE TABLE IF NOT EXISTS cvcrm_pending_updates (
  idlead       BIGINT PRIMARY KEY,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts     INT NOT NULL DEFAULT 0,
  last_error   TEXT
);
