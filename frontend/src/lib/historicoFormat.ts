import type { HistoricoMovimentacao, HistoricoTipo, NotificacaoItem } from '@/types/historico';
import { formatLeadDateCreated } from '@/lib/formatDateTime';

export const HISTORICO_TIPO_LABELS: Record<HistoricoTipo, string> = {
  lead_criado: 'Lead criado',
  lead_mudou_situacao: 'Lead · situação',
  reserva_criada: 'Reserva criada',
  reserva_mudou_situacao: 'Reserva · situação',
};

export const HISTORICO_TIPO_BADGE: Record<HistoricoTipo, string> = {
  lead_criado: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  lead_mudou_situacao: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  reserva_criada: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  reserva_mudou_situacao: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
};

export function formatHistoricoQuando(iso: string): string {
  return formatLeadDateCreated(iso);
}

export function formatHistoricoMovimentacao(row: HistoricoMovimentacao | NotificacaoItem): string {
  switch (row.tipo) {
    case 'lead_criado':
      return row.canal ? `Entrou por ${row.canal}` : 'Novo cadastro';
    case 'lead_mudou_situacao':
      return `${row.valor_de ?? '—'} → ${row.valor_para ?? '—'}`;
    case 'reserva_criada':
      return row.corretor ? `Nova reserva · ${row.corretor}` : 'Nova reserva';
    case 'reserva_mudou_situacao':
      return `${row.valor_de ?? '—'} → ${row.valor_para ?? '—'}`;
    default:
      return '—';
  }
}

export function formatHistoricoEmpreendimento(norm: string | null | undefined): string {
  const v = String(norm ?? '').trim();
  return v || '—';
}
