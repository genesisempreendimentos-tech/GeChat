-- Histórico projetado (leads + reservas) e cursor de leitura por usuário

CREATE TABLE IF NOT EXISTS historico_movimentacoes (
  id                  BIGSERIAL PRIMARY KEY,
  tipo                TEXT NOT NULL,
  entidade            TEXT NOT NULL,
  geleads_id          TEXT,
  cvcrm_lead_id       BIGINT,
  cvcrm_reserva_id    BIGINT,
  lead_nome           TEXT,
  empreendimento_cru  TEXT,
  empreendimento_norm TEXT,
  canal               TEXT,
  fonte               TEXT,
  valor_de            TEXT,
  valor_para          TEXT,
  corretor            TEXT,
  origem              TEXT NOT NULL DEFAULT 'CV',
  ocorrido_em         TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload             JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS historico_movimentacoes_dedup_uidx
  ON historico_movimentacoes (
    entidade,
    tipo,
    COALESCE(cvcrm_reserva_id, 0::bigint),
    COALESCE(cvcrm_lead_id, 0::bigint),
    COALESCE(valor_para, ''),
    ocorrido_em
  );

CREATE INDEX IF NOT EXISTS historico_movimentacoes_ocorrido_em_idx
  ON historico_movimentacoes (ocorrido_em DESC);

CREATE INDEX IF NOT EXISTS historico_movimentacoes_tipo_idx
  ON historico_movimentacoes (tipo);

CREATE INDEX IF NOT EXISTS historico_movimentacoes_geleads_id_idx
  ON historico_movimentacoes (geleads_id);

CREATE INDEX IF NOT EXISTS historico_movimentacoes_emp_norm_idx
  ON historico_movimentacoes (empreendimento_norm);

CREATE INDEX IF NOT EXISTS historico_movimentacoes_lead_nome_idx
  ON historico_movimentacoes (lead_nome);

CREATE TABLE IF NOT EXISTS notificacoes_leitura (
  user_id            TEXT PRIMARY KEY,
  ultima_leitura_em  TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01'::timestamptz
);

CREATE TABLE IF NOT EXISTS historico_projection_cursors (
  source_key         TEXT PRIMARY KEY,
  cursor_ts          TIMESTAMPTZ,
  cursor_bigint      BIGINT,
  meta               JSONB,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
