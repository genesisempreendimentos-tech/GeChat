export type VendasSituacaoCrosstab = {
  situacao: string;
  com_venda: number;
  sem_venda: number;
};

export type VendasFluxoCrosstab = {
  por_situacao: VendasSituacaoCrosstab[];
};

export type VendasDesdobramentoBalde = {
  qtd: number;
  valor: number;
  qtd_com_valor: number;
};

export type VendasDesdobramentoReservas = {
  valor_total: number;
  vendas_efetuadas: VendasDesdobramentoBalde;
  reservas_andamento: VendasDesdobramentoBalde;
  reservas_perdidas: VendasDesdobramentoBalde;
};

export type VendasDesdobramentoVendas = {
  valor_total: number;
  consolidadas: VendasDesdobramentoBalde;
  em_andamento: VendasDesdobramentoBalde;
  revertidas: VendasDesdobramentoBalde;
};

export type VendasDesdobramentoPerdas = {
  valor_total: number;
  vendas_revertidas: VendasDesdobramentoBalde;
  ativos_em_andamento: VendasDesdobramentoBalde;
  reservas_perdidas: VendasDesdobramentoBalde;
};

export type VendasDesdobramento = {
  reservas: VendasDesdobramentoReservas;
  vendas: VendasDesdobramentoVendas;
  perdas: VendasDesdobramentoPerdas;
};

export type VendasDurabilidade = {
  total_efetuadas: number;
  vendida: number;
  contrato_gerado: number;
  envio_sienge: number;
  distrato: number;
  cancelada: number;
  outros: number;
  valor_vendida: number;
  valor_contrato_gerado: number;
  valor_envio_sienge: number;
  valor_distrato: number;
  valor_cancelada: number;
  valor_outros: number;
};

export type VendasTotais = {
  reservas_totais: number;
  vendas_efetuadas: number;
  vendas_perdidas: number;
  vendas_ativas: number;
  reservas_perdidas: number;
  reservas_andamento: number;
  valor_efetuado: number;
  valor_reservas_totais: number;
  valor_vendas_efetuadas: number;
  valor_reservas_andamento: number;
  valor_reservas_perdidas: number;
  valor_vendas_perdidas: number;
  valor_perdas_totais: number;
  ticket_medio: number | null;
  corretores_que_venderam: number;
  carteira_vigente: number;
  distratos: number;
  cancelados: number;
  comissoes_valor: number;
  comissoes_preenchidas: number;
  durabilidade: VendasDurabilidade;
  desdobramento?: VendasDesdobramento;
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
