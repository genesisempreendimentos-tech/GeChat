-- Empreendimentos canônicos: cor de marca + logo (sem ícone)

ALTER TABLE empreendimentos_genesis ADD COLUMN IF NOT EXISTS cor TEXT;
ALTER TABLE empreendimentos_genesis ADD COLUMN IF NOT EXISTS logo_url TEXT;
