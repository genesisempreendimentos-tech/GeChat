-- Pipeline de reservas (vendas) CVCRM → Neon

CREATE TABLE IF NOT EXISTS cvcrm_reservas (
  idreserva            BIGINT PRIMARY KEY,
  idlead               TEXT,
  idcliente            TEXT,
  idcorretor           TEXT,
  idimobiliaria        TEXT,
  situacao             TEXT,
  situacao_comercial   TEXT,
  valor_contrato       NUMERIC,
  valor_proposta       NUMERIC,
  unidade              TEXT,
  bloco                TEXT,
  empreendimento       TEXT,
  data_venda           TIMESTAMPTZ,
  data_contrato        TIMESTAMPTZ,
  data_aprovacao       TIMESTAMPTZ,
  aprovada             BOOLEAN,
  numero_venda         TEXT,
  usuario_aprovacao    TEXT,
  nome_usuario         TEXT,
  motivo_cancelamento  TEXT,
  payload              JSONB,
  last_synced_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cvcrm_reservas_idlead
  ON cvcrm_reservas (idlead);

CREATE TABLE IF NOT EXISTS cvcrm_pending_reservas (
  idreserva    BIGINT PRIMARY KEY,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts     INT NOT NULL DEFAULT 0,
  last_error   TEXT
);

ALTER TABLE all_leads_unique ADD COLUMN IF NOT EXISTS cvcrm_sale_value NUMERIC;
ALTER TABLE all_leads_unique ADD COLUMN IF NOT EXISTS cvcrm_sale_date TIMESTAMPTZ;
