export type EmpreendimentoAlias = {
  id: number;
  valor_norm: string;
  exemplos_crus: string[];
  ocorrencias: number;
  empreendimento_id: number | null;
  status: 'a_classificar' | 'mapeado' | 'nao_informado';
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
  created_at: string;
  aliases_count: number;
  leads_count: number;
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
  alias_ids?: number[];
  remove_alias_ids?: number[];
};
