import type { computeLeadQualificacao } from '@/rules/qualifyLead';
import type { LeadStatus } from '@/types/lead';

export type LeadRelacionamento =
  | 'Solteiro(a)'
  | 'Namorando'
  | 'Noivo(a)'
  | 'União estável / Casado(a)';

export type LeadInvestimento =
  | 'Entre R$1000 e R$1700'
  | 'Entre R$1701 e R$2500'
  | 'Entre R$2501 e R$3500'
  | 'Acima de R$3500';

export type LeadPerfilTipo = 'Morador' | 'Investidor' | 'Corretor';

export type LeadRow = {
  id: string;
  dataHora: string;
  nome: string;
  contato: string;
  pagina: string;
  origem: string;
  canal: string;
  qualificacao: ReturnType<typeof computeLeadQualificacao>;
  email: string;
  telefone: string;
  relacionamento: LeadRelacionamento | '';
  investimento: LeadInvestimento | '';
  cidadeResidencia: string;
  dataNascimento: string;
  perfilLead: LeadPerfilTipo | '';
  perfilOutrasRespostas: string;
  dispositivo: string;
  pagamentoPreferencia: string;
  empreendimento: string;
  responsavel: string;
  parametro: string;
  status?: LeadStatus;
  cvcrmLeadId?: string | null;
  _table?: string;
};
