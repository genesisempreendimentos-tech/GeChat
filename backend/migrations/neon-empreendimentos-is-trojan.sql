-- Empreendimentos "Trojan": agrupam aliases sem interesse genuíno (não sei, null, etc.)
ALTER TABLE empreendimentos_genesis
  ADD COLUMN IF NOT EXISTS is_trojan BOOLEAN NOT NULL DEFAULT false;

UPDATE empreendimentos_genesis
SET is_trojan = true
WHERE nome ILIKE 'Indefinido' AND is_trojan IS DISTINCT FROM true;
