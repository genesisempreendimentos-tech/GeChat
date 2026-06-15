/*
  OBSOLETO — colunas de maturação não fazem parte do schema canônico de all_leads.

  Datas de estágio ficam no CVCRM / all_leads_unique (próximas levas).
  Mantido apenas como referência histórica; não executar em banco novo.
*/

-- ALTER TABLE all_leads ADD COLUMN IF NOT EXISTS data_primeiro_atendimento TIMESTAMPTZ;
-- ALTER TABLE all_leads ADD COLUMN IF NOT EXISTS data_visita_agendada TIMESTAMPTZ;
-- ALTER TABLE all_leads ADD COLUMN IF NOT EXISTS data_visita_realizada TIMESTAMPTZ;
-- ALTER TABLE all_leads ADD COLUMN IF NOT EXISTS data_analise_credito_inicio TIMESTAMPTZ;
-- ALTER TABLE all_leads ADD COLUMN IF NOT EXISTS data_analise_credito_fim TIMESTAMPTZ;
-- ALTER TABLE all_leads ADD COLUMN IF NOT EXISTS data_proposta TIMESTAMPTZ;
-- ALTER TABLE all_leads ADD COLUMN IF NOT EXISTS data_venda TIMESTAMPTZ;
-- ALTER TABLE all_leads ADD COLUMN IF NOT EXISTS data_perdido TIMESTAMPTZ;
-- ALTER TABLE all_leads ADD COLUMN IF NOT EXISTS motivo_perda TEXT;
