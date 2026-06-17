export type LeadsQualificacaoStatus = 'Indefinida' | 'N/A' | 'Baixa' | 'Média' | 'Alta';

/** Superset das 3 abas — contrato GET /api/leads/list */
export type LeadsListRow = {
  person_id: string;
  id_amigavel: string;
  codigo: string | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  empreendimento_interesse: string | null;
  canal_bucket: string;
  canal_raw: string;
  parameter: string | null;
  cvcrm_lead_id: string | null;
  /** Qualificação de marketing — NÃO situação do funil CV */
  status_qualificacao: LeadsQualificacaoStatus;
  birth_date: string | null;
  relacionamento: string | null;
  investimento: string | null;
  cidade: string | null;
  perfil_tipo: string | null;
  children_status: string | null;
  observacoes: string | null;
  responsavel: string | null;
  created_at: string;
};
