-- Log de webhooks recebidos do CVCRM
CREATE TABLE IF NOT EXISTS cvcrm_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idlead TEXT NOT NULL,
  payload_recebido JSONB,
  resposta_cvcrm JSONB,
  tabelas_atualizadas TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cvcrm_webhook_logs_idlead_idx ON cvcrm_webhook_logs (idlead);
CREATE INDEX IF NOT EXISTS cvcrm_webhook_logs_created_at_idx ON cvcrm_webhook_logs (created_at DESC);
