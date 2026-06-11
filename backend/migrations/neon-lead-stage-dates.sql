-- Datas de transição entre etapas do funil comercial (maturação de leads)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_primeiro_atendimento TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_visita_agendada TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_visita_realizada TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_analise_credito_inicio TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_analise_credito_fim TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_proposta TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_venda TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_perdido TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS motivo_perda TEXT;
