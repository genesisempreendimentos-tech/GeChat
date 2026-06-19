export type EmpreendimentosKindFilter = 'empreendimentos' | 'troia';

export type EmpreendimentoAlias = {
  id: number;
  valor_norm: string;
  exemplos_crus: string[];
  ocorrencias: number;
  empreendimento_id: number | null;
  status: 'a_classificar' | 'mapeado' | 'nao_informado';
};

export type EmpreendimentoAliasListItem = EmpreendimentoAlias & {
  empreendimento_nome?: string | null;
};

export type EmpreendimentoAliasCluster = {
  cluster_id: string;
  representative: string;
  total_ocorrencias: number;
  aliases: EmpreendimentoAlias[];
};

export type EmpreendimentoAliasStats = {
  total: number;
  a_classificar: number;
  mapeado: number;
  nao_informado: number;
};

export type EmpreendimentoGenesis = {
  id: number;
  nome: string;
  cor: string | null;
  logo_url: string | null;
  ativo: boolean;
  is_trojan?: boolean;
  created_at: string;
  aliases_count: number;
  leads_count: number;
  /** Pessoas distintas (geleads_id) com interesse mapeado — mesma métrica do Analytics. */
  pessoas_unicas_count?: number;
  interesses_count?: number;
  qualificados_count: number;
  taxa_qualificacao: number;
  percentual_do_total: number;
  reservas_count: number;
  v_andamento_count: number;
  vendas_count: number;
  total_all_leads?: number;
};

export type EmpreendimentoGenesisDetail = EmpreendimentoGenesis & {
  aliases: EmpreendimentoAlias[];
  pending_aliases: number;
};

export type EmpreendimentoSavePayload = {
  nome: string;
  cor?: string | null;
  logo_url?: string | null;
  is_trojan?: boolean;
  alias_ids?: number[];
  remove_alias_ids?: number[];
};

export type EmpreendimentosAnalyticsMetric = {
  count: number;
  percent: number;
};

export type EmpreendimentosAnalyticsBignumbers = {
  total_pessoas: EmpreendimentosAnalyticsMetric;
  total_cadastros: EmpreendimentosAnalyticsMetric;
  com_empreendimento: EmpreendimentosAnalyticsMetric;
  sem_interesse: EmpreendimentosAnalyticsMetric;
  sem_empreendimento: EmpreendimentosAnalyticsMetric;
  total_interesses: EmpreendimentosAnalyticsMetric;
  empreendimentos_ativos: EmpreendimentosAnalyticsMetric;
  aliases_mapeados: EmpreendimentosAnalyticsMetric;
};

export type EmpreendimentosAnalyticsSlice = {
  id: number;
  nome: string;
  cor: string | null;
  pessoas_unicas: number;
  total_interesses: number;
  count: number;
  percent: number;
};

export type EmpreendimentosAnalyticsData = {
  bignumbers: EmpreendimentosAnalyticsBignumbers;
  interesse_coverage: {
    pessoas_empreendimentos: number;
    pessoas_troia: number;
    total: number;
    com_interesse_genuino?: number;
    sem_interesse_trojan_only?: number;
    sem_empreendimento?: number;
    total_pessoas?: number;
    total_interesses: number;
  };
  por_empreendimento: EmpreendimentosAnalyticsSlice[];
};
