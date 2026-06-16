-- Pipeline de comissões CVCRM → Neon

CREATE TABLE IF NOT EXISTS cvcrm_comissoes (
  idcomissao              BIGINT PRIMARY KEY,
  idreserva               BIGINT,
  idcorretor              TEXT,
  corretor                TEXT,
  imobiliaria             TEXT,
  empreendimento          TEXT,
  situacao                TEXT,
  idsituacao              BIGINT,
  ativo                   BOOLEAN,
  porcentagem_comissao    NUMERIC,
  valor_comissao          NUMERIC,
  valor_comissao_apagar   NUMERIC,
  valor_pagamento         NUMERIC,
  valor_contrato          NUMERIC,
  data_pagamento          TIMESTAMPTZ,
  data_cad                TIMESTAMPTZ,
  referencia_data         TIMESTAMPTZ,
  etapa                   TEXT,
  bloco                   TEXT,
  unidade                 TEXT,
  regiao                  TEXT,
  cliente                 TEXT,
  payload                 JSONB,
  last_synced_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cvcrm_comissoes_idreserva
  ON cvcrm_comissoes (idreserva);

CREATE INDEX IF NOT EXISTS idx_cvcrm_comissoes_idcorretor
  ON cvcrm_comissoes (idcorretor);

CREATE TABLE IF NOT EXISTS cvcrm_comissao_pagamentos (
  idpagamento             BIGINT PRIMARY KEY,
  idcomissao              BIGINT,
  valor                   NUMERIC,
  vencimento              DATE,
  situacao                TEXT,
  idboleto                TEXT,
  bloco                   TEXT,
  unidade                 TEXT,
  referencia_data         TIMESTAMPTZ,
  payload                 JSONB,
  last_synced_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cvcrm_comissao_pagamentos_idcomissao
  ON cvcrm_comissao_pagamentos (idcomissao);

INSERT INTO cvcrm_sync_cursors (entity) VALUES ('comissoes'), ('comissoes_pagamentos')
ON CONFLICT (entity) DO NOTHING;
