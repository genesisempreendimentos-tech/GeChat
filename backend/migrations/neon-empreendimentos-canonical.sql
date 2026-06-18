-- Registro canônico de empreendimentos (aliases + catálogo admin)
-- Execute no SQL Editor do Neon ou via ensureEmpreendimentosSchema()

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS empreendimentos_genesis (
  id          BIGSERIAL PRIMARY KEY,
  nome        TEXT NOT NULL UNIQUE,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS empreendimento_aliases (
  id                BIGSERIAL PRIMARY KEY,
  valor_norm        TEXT NOT NULL UNIQUE,
  exemplos_crus     TEXT[] NOT NULL DEFAULT '{}',
  ocorrencias       INT NOT NULL DEFAULT 0,
  empreendimento_id BIGINT NULL REFERENCES empreendimentos_genesis(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'a_classificar'
    CHECK (status IN ('a_classificar', 'mapeado', 'nao_informado')),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS empreendimento_aliases_status_idx
  ON empreendimento_aliases (status);

CREATE INDEX IF NOT EXISTS empreendimento_aliases_valor_norm_trgm_idx
  ON empreendimento_aliases USING gin (valor_norm gin_trgm_ops);
