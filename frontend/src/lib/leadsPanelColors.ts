/** Cores de canal (teal / sky / violet / amber / slate). */
import { normalizeCanalBucketLabel } from '@/lib/leadsCanalLabels';

export const LEADS_CANAL_COLORS: Record<string, string> = {
  'Site forms': '#14b8a6',
  'Formulário do site': '#14b8a6',
  'Meta Forms': '#0ea5e9',
  'Painel CV': '#8b5cf6',
  WhatsApp: '#f59e0b',
  Outros: '#64748b',
};

export const LEADS_FONTE_COLORS = {
  Marketing: '#14b8a6',
  Externo: '#6366f1',
} as const;

export const LEADS_TIMELINE_COLORS = [
  '#14b8a6',
  '#0ea5e9',
  '#8b5cf6',
  '#f59e0b',
  '#ec4899',
  '#22c55e',
  '#64748b',
  '#94a3b8',
];

export function canalColor(canal: string): string {
  const label = normalizeCanalBucketLabel(canal);
  return LEADS_CANAL_COLORS[label] ?? '#64748b';
}

export function timelineSeriesColor(index: number): string {
  return LEADS_TIMELINE_COLORS[index % LEADS_TIMELINE_COLORS.length];
}
