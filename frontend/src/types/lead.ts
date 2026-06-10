export type LeadStatus = 'novo' | 'contato' | 'qualificado' | 'negociacao' | 'ganho' | 'perdido';

export type LeadGender = 'male' | 'female';

export interface Lead {
  id: string;
  name: string;
  gender?: LeadGender | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  campaign: string | null;
  status: LeadStatus;
  notes: string | null;
  assignedTo: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  cvcrmLeadId?: string | null;
  cvcrmSyncStatus?: string;
  cvcrm_is_sold?: boolean;
  dataHora: string; // Mapeia para 'createdAt' no Lead ou uma coluna de timestamp
  nome: string; // Mapeia para 'name' no Lead
  contato: string; // Pode ser derivado de 'email' ou 'phone'
  pagina: string;
  origem: string; // Mapeia para 'source' no Lead
  canal: string; // Mapeia para 'campaign' ou outro campo
  qualificacao: 'Indefinida' | 'N/A' | 'Baixa' | 'Média' | 'Alta'; // Pode ser derivado de 'status'
  relacionamento: 'Solteiro(a)' | 'Namorando' | 'Noivo(a)' | 'União estável / Casado(a)' | '';
  investimento: 'Entre R$1000 e R$1700' | 'Entre R$1701 e R$2500' | 'Entre R$2501 e R$3500' | 'Acima de R$3500' | '';
  cidadeResidencia: string;
  dataNascimento: string;
  perfilLead: 'Morador' | 'Investidor' | 'Corretor' | '';
  perfilOutrasRespostas: string;
  dispositivo: string;
  pagamentoPreferencia: string;
  empreendimento: string;
  responsavel: string;
  parametro: string;
  _table: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  userId: string;
  type: string;
  description: string;
  createdAt: string;
}

export interface LeadStats {
  total: number;
  newToday: number;
  byStatus: Record<LeadStatus, number>;
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: 'Novo',
  contato: 'Em contato',
  qualificado: 'Qualificado',
  negociacao: 'Negociação',
  ganho: 'Ganho',
  perdido: 'Perdido',
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  novo: 'bg-blue-500/15 text-blue-600',
  contato: 'bg-amber-500/15 text-amber-600',
  qualificado: 'bg-purple-500/15 text-purple-600',
  negociacao: 'bg-orange-500/15 text-orange-600',
  ganho: 'bg-emerald-500/15 text-emerald-600',
  perdido: 'bg-red-500/15 text-red-600',
};

export type LeadStatusEmoji = {
  code: string;
  alt: string;
  label: string;
};

/** Emojis Noto por status do lead. */
export const LEAD_STATUS_EMOJI: Record<LeadStatus, LeadStatusEmoji> = {
  novo: { code: '1f929', alt: '🤩', label: 'Lead novo' },
  contato: { code: '1f914', alt: '🤔', label: 'Lead pendente' },
  qualificado: { code: '1f911', alt: '🤑', label: 'Lead qualificado' },
  negociacao: { code: '1f979', alt: '🥹', label: 'Lead ruim' },
  ganho: { code: '1f601', alt: '😁', label: 'Lead bom' },
  perdido: { code: '1f614', alt: '😔', label: 'Lead perdido' },
};

export const LEAD_STATUS_ACCENT: Record<LeadStatus, { border: string; bg: string; ring: string }> = {
  novo: {
    border: 'border-blue-500/25',
    bg: 'bg-blue-500/10',
    ring: 'ring-blue-500/30',
  },
  contato: {
    border: 'border-amber-500/25',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/30',
  },
  qualificado: {
    border: 'border-violet-500/25',
    bg: 'bg-violet-500/10',
    ring: 'ring-violet-500/30',
  },
  negociacao: {
    border: 'border-orange-500/25',
    bg: 'bg-orange-500/10',
    ring: 'ring-orange-500/30',
  },
  ganho: {
    border: 'border-emerald-500/25',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/30',
  },
  perdido: {
    border: 'border-red-500/25',
    bg: 'bg-red-500/10',
    ring: 'ring-red-500/30',
  },
};
