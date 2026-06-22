-- Unidades totais do empreendimento (estoque cadastrado manualmente).
ALTER TABLE empreendimentos_genesis
  ADD COLUMN IF NOT EXISTS unidades INTEGER NOT NULL DEFAULT 0;
