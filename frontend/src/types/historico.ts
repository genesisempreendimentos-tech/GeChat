export type HistoricoTipo =
  | 'lead_criado'
  | 'lead_mudou_situacao'
  | 'reserva_criada'
  | 'reserva_mudou_situacao';

export type HistoricoMovimentacao = {
  id: number;
  tipo: HistoricoTipo;
  entidade: 'lead' | 'reserva';
  geleads_id: string | null;
  cvcrm_lead_id: number | null;
  cvcrm_reserva_id: number | null;
  lead_nome: string | null;
  empreendimento_cru: string | null;
  empreendimento_norm: string | null;
  canal: string | null;
  fonte: string | null;
  valor_de: string | null;
  valor_para: string | null;
  corretor: string | null;
  origem: string | null;
  ocorrido_em: string;
  hora_deteccao: boolean;
  payload: Record<string, unknown> | null;
};

export type HistoricoListResponse = {
  rows: HistoricoMovimentacao[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type HistoricoFilters = {
  tipos: HistoricoTipo[];
  empreendimento: string;
  data_de: string;
  data_ate: string;
  busca: string;
};

export type NotificacaoItem = {
  id: number;
  tipo: HistoricoTipo;
  entidade: string;
  geleads_id: string | null;
  lead_nome: string | null;
  empreendimento_norm: string | null;
  valor_de: string | null;
  valor_para: string | null;
  corretor: string | null;
  canal: string | null;
  origem: string | null;
  ocorrido_em: string;
  hora_deteccao: boolean;
  lida: boolean;
};

export type NotificacoesResponse = {
  ultima_leitura_em: string;
  nao_lidas: number;
  items: NotificacaoItem[];
};
