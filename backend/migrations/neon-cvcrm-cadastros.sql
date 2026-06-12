-- Cadastros CVCRM: corretores e imobiliárias + atribuição em leads

CREATE TABLE IF NOT EXISTS cvcrm_corretores (
  idcorretor      BIGINT PRIMARY KEY,
  nome            TEXT,
  documento       TEXT,
  idimobiliaria   TEXT,
  imobiliaria     TEXT,
  payload         JSONB,
  last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cvcrm_imobiliarias (
  idimobiliaria   BIGINT PRIMARY KEY,
  nome            TEXT,
  cnpj            TEXT,
  payload         JSONB,
  last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS idcorretor TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS idimobiliaria TEXT;
