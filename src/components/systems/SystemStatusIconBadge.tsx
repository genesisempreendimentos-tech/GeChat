import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  Rocket,
  SquareCheck,
  SquarePen,
  TestTubeDiagonal,
  Trash2,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/** Ícone + rótulo do tooltip (mesmos ícones das abas de filtro no admin, exceto excluído). */
const SYSTEM_CARD_STATUS_META: Record<string, { Icon: LucideIcon; label: string }> = {
  ativo: { Icon: SquareCheck, label: 'Ativo' },
  lancamento: { Icon: Rocket, label: 'Lançamento' },
  beta: { Icon: TestTubeDiagonal, label: 'Beta' },
  rascunho: { Icon: SquarePen, label: 'Rascunho' },
  arquivado: { Icon: Archive, label: 'Arquivado' },
  'excluído': { Icon: Trash2, label: 'Excluído' },
  excluido: { Icon: Trash2, label: 'Excluído' },
};

export function systemStatusNorm(status: string | undefined): string {
  return (status ?? 'rascunho').toLowerCase().trim();
}

export function systemStatusBadgeSurfaceClass(status: string | undefined): string {
  const s = systemStatusNorm(status);
  const isExcluded = s === 'excluído' || s === 'excluido';
  if (isExcluded) return 'bg-destructive/15 border-destructive/30 text-destructive';
  return s === 'ativo'
    ? 'bg-primary/15 border-primary/30 text-primary'
    : s === 'lancamento'
      ? 'bg-blue-600/25 border-blue-600/50 text-blue-300'
      : s === 'beta'
        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
        : s === 'rascunho'
          ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
          : s === 'arquivado'
            ? 'bg-muted/60 border-border/50 text-muted-foreground'
            : 'bg-orange-500/15 border-orange-500/30 text-orange-400';
}

export function getSystemCardStatusMeta(status: string | undefined): { Icon: LucideIcon; label: string } {
  const key = systemStatusNorm(status);
  const mapKey = key === 'excluido' ? 'excluído' : key;
  return SYSTEM_CARD_STATUS_META[mapKey] ?? SYSTEM_CARD_STATUS_META.rascunho;
}

const statusTooltipContentClass =
  'rounded-xl border border-border/60 bg-card/95 backdrop-blur-xl px-3 py-2 text-xs font-semibold text-foreground shadow-lg';

export function SystemStatusIconBadge({
  status,
  variant,
}: {
  status: string | undefined;
  variant: 'card' | 'table';
}) {
  const { Icon, label } = getSystemCardStatusMeta(status);
  const cls = systemStatusBadgeSurfaceClass(status);
  const box = variant === 'card' ? 'h-7 w-7' : 'h-6 w-6';
  const iconSz = variant === 'card' ? 'h-3.5 w-3.5' : 'h-3 w-3';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label={label}
          tabIndex={0}
          className={cn(
            'inline-flex items-center justify-center rounded-full border shrink-0 cursor-default outline-none',
            'focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            box,
            cls,
          )}
        >
          <Icon className={cn(iconSz, 'shrink-0')} strokeWidth={2} aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className={statusTooltipContentClass}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
