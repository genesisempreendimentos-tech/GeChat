export type VendasSituacaoCrosstab = {
  situacao: string;
  com_venda: number;
  sem_venda: number;
};

export type VendasFluxoCrosstab = {
  por_situacao: VendasSituacaoCrosstab[];
};

export type VendasDurabilidade = {
  total_efetuadas: number;
  vendida: number;
  contrato_gerado: number;
  envio_sienge: number;
  distrato: number;
  cancelada: number;
  outros: number;
};

export type VendasTotais = {
  reservas_totais: number;
  vendas_efetuadas: number;
  vendas_perdidas: number;
  vendas_ativas: number;
  reservas_perdidas: number;
  reservas_andamento: number;
  valor_efetuado: number;
  ticket_medio: number | null;
  corretores_que_venderam: number;
  carteira_vigente: number;
  distratos: number;
  cancelados: number;
  durabilidade: VendasDurabilidade;
};

export type VendasCorretorRanking = {
  idcorretor: string;
  nome: string | null;
  imobiliaria: string | null;
  leads: number;
  vendas: number;
  valor_vendas: number;
  ticket_medio: number | null;
};

export type VendasImobiliariaRanking = {
  imobiliaria: string;
  vendas: number;
  valor_vendas: number;
};

export type VendasCompetenciaResponse = {
  totais: VendasTotais;
  ranking: VendasCorretorRanking[];
  ranking_imobiliarias: VendasImobiliariaRanking[];
  fluxo_crosstab: VendasFluxoCrosstab;
};

export type VendasPeriodoPreset = 'todos' | '30d' | '90d' | 'ytd' | '12m';

export type VendasFilters = {
  periodo: VendasPeriodoPreset;
  empreendimento: string;
  imobiliaria: string;
};

export type VendasTopItem = {
  id: string;
  label: string;
  valor: number;
  vendas?: number;
};
