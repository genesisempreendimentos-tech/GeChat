import { cn } from '@/lib/utils';
import {
  EMPREENDIMENTO_STATUS_LABELS,
  type EmpreendimentoStatus,
} from '@/lib/empreendimentosMetrics';

export const EMPREENDIMENTO_STATUS_BADGE: Record<EmpreendimentoStatus, string> = {
  BOM_DESEMPENHO: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  BOM_VOLUME: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  ALTA_QUALIDADE: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  BAIXO_AVANCO: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  SEM_AVANCO_COMERCIAL: 'bg-orange-500/15 text-orange-800 dark:text-orange-200',
  BASE_ENVELHECIDA: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  CRITICO: 'bg-red-500/15 text-red-700 dark:text-red-300',
  POUCOS_DADOS: 'bg-muted text-muted-foreground',
  EM_ANALISE: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
};

type EmpreendimentoStatusBadgeProps = {
  status: EmpreendimentoStatus;
  className?: string;
};

export function EmpreendimentoStatusBadge({ status, className }: EmpreendimentoStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        EMPREENDIMENTO_STATUS_BADGE[status],
        className,
      )}
    >
      {EMPREENDIMENTO_STATUS_LABELS[status]}
    </span>
  );
}
