-- Projeção person-grain: par (geleads_id, empreendimento_norm) deduplicado.
-- Fonte = união form + site de origem + CV sobre todos os cadastros da pessoa.
-- Resolução para empreendimento canônico Genesis ocorre na leitura (empreendimentoResolver).

CREATE TABLE IF NOT EXISTS lead_empreendimento_interesse (
  geleads_id          TEXT NOT NULL,
  empreendimento_norm TEXT NOT NULL,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (geleads_id, empreendimento_norm)
);

CREATE INDEX IF NOT EXISTS lead_empreendimento_interesse_norm_idx
  ON lead_empreendimento_interesse (empreendimento_norm);

CREATE INDEX IF NOT EXISTS lead_empreendimento_interesse_geleads_idx
  ON lead_empreendimento_interesse (geleads_id);
