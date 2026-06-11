/** Textos dos tooltips (ícone ℹ) dos cards de métricas de leads. */
export const LEADS_METRIC_TOOLTIPS = {
  leads: 'Total de leads capturados no período filtrado.',
  leadsRecebidos: 'Leads do período disponíveis para o time comercial.',
  qualificados: 'Leads com qualificação Alta ou Média após perfil completo.',
  conversaoVisitanteLead:
    'Percentual de leads com perfil completo em relação ao total captado no período.',
  entradaLeads: 'Distribuição da entrada entre formulário e WhatsApp.',
  forms: 'Leads que entraram com e-mail (formulário de contato).',
  whatsapp: 'Leads que entraram pelo WhatsApp.',
  taxaConversao: 'Percentual de leads com perfil completo em relação ao total de leads.',
  pontuacao:
    'Média da pontuação dos leads no período, calculada a partir da qualificação de cada lead.',
  atendimentoCorretor:
    'Leads em atendimento comercial, com base no estágio registrado no CVCRM.',
  visitasAgendadas: 'Leads que avançaram para visita, conforme estágio no CVCRM.',
  analiseCredito:
    'Leads em análise de crédito, conforme estágio no CVCRM ou data de início registrada.',
  vendas: 'Vendas confirmadas no CVCRM. Atualizado via webhook.',
  sincronizados: 'Leads enviados ao CVCRM com cvcrm_sync_status = synced no Neon.',
} as const;
