import type { LeadQualificacao } from '@/rules/qualifyLead';

export type QualificacaoEmoji = {
  code: string;
  alt: string;
  label: string;
};

export const LEAD_QUALIFICACAO_EMOJI: Record<LeadQualificacao, QualificacaoEmoji> = {
  Alta: { code: '1f601', alt: '😁', label: 'Qualificação alta' },
  Média: { code: '1f44d', alt: '👍', label: 'Qualificação média' },
  Baixa: { code: '1f614', alt: '😔', label: 'Qualificação baixa' },
  Indefinida: { code: '1f914', alt: '🤔', label: 'Perfil incompleto' },
  'N/A': { code: '1f929', alt: '🤩', label: 'Lead novo' },
};

export const LEAD_QUALIFICACAO_ACCENT: Record<
  LeadQualificacao,
  { border: string; bg: string; ring: string }
> = {
  Alta: {
    border: 'border-emerald-500/25',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/30',
  },
  Média: {
    border: 'border-violet-500/25',
    bg: 'bg-violet-500/10',
    ring: 'ring-violet-500/30',
  },
  Baixa: {
    border: 'border-red-500/25',
    bg: 'bg-red-500/10',
    ring: 'ring-red-500/30',
  },
  Indefinida: {
    border: 'border-amber-500/25',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/30',
  },
  'N/A': {
    border: 'border-blue-500/25',
    bg: 'bg-blue-500/10',
    ring: 'ring-blue-500/30',
  },
};
