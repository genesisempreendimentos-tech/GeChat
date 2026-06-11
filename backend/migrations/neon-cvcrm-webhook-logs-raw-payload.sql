-- Payload bruto do webhook CVCRM (headers, body, query) antes de qualquer processamento
ALTER TABLE cvcrm_webhook_logs
  ADD COLUMN IF NOT EXISTS raw_payload JSONB;
