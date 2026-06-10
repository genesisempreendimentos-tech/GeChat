/** Textos dos tooltips (ícone ℹ) dos cards de métricas de leads. */
export const LEADS_METRIC_TOOLTIPS = {
  leads: 'Total de leads capturados no período filtrado.',
  forms: 'Leads que entraram com e-mail (formulário de contato).',
  whatsapp: 'Leads que entraram pelo WhatsApp.',
  taxaConversao: 'Percentual de leads com perfil completo em relação ao total de leads.',
  pontuacao:
    'Média da pontuação dos leads no período, calculada a partir da qualificação de cada lead.',
  atendimentoCorretor: 'Em atendimento no CVCRM. Dado real virá via webhook (em breve).',
  visitasAgendadas: 'Visitas agendadas no CVCRM. Dado real virá via webhook (em breve).',
  analiseCredito:
    'Leads com perfil completo e preferência por financiamento ou parcelamento.',
  vendas: 'Vendas confirmadas no CVCRM. Atualizado via webhook.',
  sincronizados: 'Leads enviados ao CVCRM com cvcrm_sync_status = synced no Neon.',
} as const;
