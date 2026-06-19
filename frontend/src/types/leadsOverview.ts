export type LeadsPeriodoPreset = '30d' | '90d' | '12m' | 'ytd' | 'todos';

export type LeadsFonteFilter = 'todos' | 'marketing' | 'externo';

export type LeadsTimelineGrain = 'cadastros' | 'pessoas';

export type LeadsDistribuicaoGrain = 'cadastros' | 'pessoas';

export type LeadsPanelFilters = {
  periodo: LeadsPeriodoPreset;
  canal: string;
  fonte: LeadsFonteFilter;
  empreendimento: string;
  situacao_cv: string;
  busca: string;
};

export type LeadsMetricBlock = {
  count: number;
  percent: number;
};

export type LeadsBignumbersData = {
  leads_totais: LeadsMetricBlock;
  leads_unicos: LeadsMetricBlock;
  duplicados: LeadsMetricBlock;
  qualificados: LeadsMetricBlock;
  converteram_reserva: LeadsMetricBlock;
  viraram_venda: LeadsMetricBlock;
  reservas_marketing: LeadsMetricBlock;
  reservas_externas: LeadsMetricBlock;
  com_interesse_genuino: LeadsMetricBlock;
  sem_interesse: LeadsMetricBlock;
};

export type LeadsOverviewResponse = {
  bignumbers: LeadsBignumbersData;
  distribuicao: {
    por_canal: { canal: string; cadastros: number; pessoas: number }[];
    por_fonte: { fonte: string; cadastros: number; pessoas: number }[];
    por_empreendimento: { empreendimento: string; cadastros: number; pessoas: number }[];
  };
  timeline: {
    series: string[] | { dataKey: string; name: string; color?: string }[];
    points: Record<string, string | number>[];
    grain: LeadsTimelineGrain;
  };
};

export type LeadsChartsBlock = Pick<LeadsOverviewResponse, 'distribuicao' | 'timeline'>;

export type { LeadsListRow, LeadsQualificacaoStatus } from '@/types/leadsList';

export type LeadsListResponse = {
  rows: import('@/types/leadsList').LeadsListRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type LeadsOverviewQuery = Omit<LeadsPanelFilters, 'busca'> & {
  timeline_grain?: LeadsTimelineGrain;
};

export type LeadsListQuery = LeadsPanelFilters & {
  page?: number;
  pageSize?: number;
};
