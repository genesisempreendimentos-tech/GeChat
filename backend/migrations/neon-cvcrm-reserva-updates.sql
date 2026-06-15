-- Histórico de mudanças de situação das reservas CVCRM (irmã de cvcrm_lead_updates)

CREATE TABLE IF NOT EXISTS cvcrm_reserva_updates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idreserva        BIGINT NOT NULL,
  idlead           TEXT,
  situacao_anterior TEXT,
  situacao_nova    TEXT NOT NULL,
  changed_at       TIMESTAMPTZ NOT NULL,
  observed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  idcorretor       TEXT,
  idimobiliaria    TEXT,
  valor_contrato   NUMERIC,
  empreendimento   TEXT,
  data_venda       TIMESTAMPTZ,
  payload          JSONB,
  UNIQUE (idreserva, changed_at, situacao_nova)
);

CREATE INDEX IF NOT EXISTS idx_cvcrm_reserva_updates_idreserva
  ON cvcrm_reserva_updates (idreserva);

CREATE INDEX IF NOT EXISTS idx_cvcrm_reserva_updates_idlead
  ON cvcrm_reserva_updates (idlead);

CREATE INDEX IF NOT EXISTS idx_cvcrm_reserva_updates_observed_at
  ON cvcrm_reserva_updates (observed_at DESC);
