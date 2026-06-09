export type GesiteBalancoMode = 'desligado' | 'mes_anterior' | 'semana_anterior';

/** Segmento alinhado aos cartões de métricas do GêSite Leads. */
export type GesiteMetricaFiltro =
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

export type GesitePageControlFilters = {
  balanco: GesiteBalancoMode;
  metrica: GesiteMetricaFiltro;
};

export const GESITE_METRICA_FILTRO_OPTIONS: { value: GesiteMetricaFiltro; label: string }[] = [
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

export function defaultGesitePageControlFilters(): GesitePageControlFilters {
  return { balanco: 'desligado', metrica: 'todos' };
}
