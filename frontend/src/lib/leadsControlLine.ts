export type LeadsBalancoMode = 'desligado' | 'mes_anterior' | 'semana_anterior';

/** Segmento alinhado aos cartões de métricas de Leads. */
export type LeadMetricaFiltro =
  | 'todos'
  | 'leads'
  | 'forms'
  | 'whatsapp'
  | 'taxa_conversao'
  | 'pontuacao'
  | 'vendas'
  | 'visitas_agendadas'
  | 'atendimento_corretor'
  | 'analise_credito';

export type LeadsPageControlFilters = {
  balanco: LeadsBalancoMode;
  metrica: LeadMetricaFiltro;
};

export const LEADS_METRICA_FILTRO_OPTIONS: { value: LeadMetricaFiltro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'leads', label: 'Leads' },
  { value: 'forms', label: 'Forms' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'taxa_conversao', label: 'Taxa de Conversão' },
  { value: 'atendimento_corretor', label: 'Em atendimento' },
  { value: 'visitas_agendadas', label: 'Visitas' },
  { value: 'analise_credito', label: 'Análise de Crédito' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'pontuacao', label: 'Pontuação' },
];

export function defaultLeadsPageControlFilters(): LeadsPageControlFilters {
  return { balanco: 'desligado', metrica: 'todos' };
}
