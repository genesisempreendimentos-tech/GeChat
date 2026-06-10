import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { LeadsBalanceComparison } from '@/components/charts/Balance';
import { MotionFlipNumber, MotionReveal } from '@/components/motion/AppMotion';

type InfoBoxCor = 'emerald' | 'blue' | 'amber' | 'violet' | 'muted';

const COR_CLASS: Record<InfoBoxCor, { shell: string; icon: string }> = {
  emerald: {
    shell: 'border-emerald-500/20 bg-emerald-500/5',
    icon: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  },
  blue: {
    shell: 'border-blue-500/20 bg-blue-500/5',
    icon: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  },
  amber: {
    shell: 'border-amber-500/20 bg-amber-500/5',
    icon: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
  violet: {
    shell: 'border-violet-500/20 bg-violet-500/5',
    icon: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  },
  muted: {
    shell: 'border-border/60 bg-muted/30',
    icon: 'bg-muted text-muted-foreground',
  },
};

/** Estilo unificado dos tooltips dos cards de métricas de leads. */
export const INFOBOX_TOOLTIP_CONTENT_CLASS = cn(
  'max-w-[min(13.333rem,calc((100vw-2rem)*2/3))]',
  'border-border/60 bg-popover px-3 py-2 text-xs font-extralight leading-relaxed text-popover-foreground shadow-md',
);

type InfoBoxProps = {
  title: string;
  value: ReactNode;
  icon: ReactNode;
  cor?: InfoBoxCor;
  infoTooltip?: string;
  infoTooltipAlign?: 'start' | 'center' | 'end';
  balanceDelta?: number;
  balanceComparison?: LeadsBalanceComparison | null;
  balanceFormat?: 'percent-points';
  className?: string;
  motionIndex?: number;
  /** Odômetro nos valores — desligar em dashboards com muitas atualizações simultâneas. */
  animateValue?: boolean;
};

function formatBalanceDelta(delta: number, format?: 'percent-points') {
  const sign = delta > 0 ? '+' : '';
  if (format === 'percent-points') return `${sign}${delta} p.p.`;
  return `${sign}${delta.toLocaleString('pt-BR')}`;
}

export function InfoBox({
  title,
  value,
  icon,
  cor = 'muted',
  infoTooltip,
  infoTooltipAlign = 'start',
  balanceDelta,
  balanceComparison,
  balanceFormat,
  className,
  motionIndex = 0,
  animateValue = true,
}: InfoBoxProps) {
  const palette = COR_CLASS[cor];
  const showDelta = balanceComparison != null && balanceDelta != null && balanceDelta !== 0;
  const deltaUp = (balanceDelta ?? 0) > 0;

  return (
    <MotionReveal
      index={motionIndex}
      className={cn(
        'flex min-h-[8.25rem] flex-col gap-4 rounded-2xl border p-5 shadow-sm backdrop-blur-sm',
        palette.shell,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', palette.icon)}>
            <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
          </div>
          <p className="truncate text-sm font-medium text-muted-foreground">{title}</p>
        </div>
        {infoTooltip ? (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors',
                  'hover:bg-accent hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                )}
                aria-label={`Informação: ${title}`}
              >
                <Info className="size-3.5" strokeWidth={2.25} />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align={infoTooltipAlign}
              sideOffset={8}
              collisionPadding={20}
              className={INFOBOX_TOOLTIP_CONTENT_CLASS}
            >
              {infoTooltip}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <p className="inline-flex min-h-[1em] items-center text-2xl font-bold leading-none tracking-tight text-foreground">
          {typeof value === 'number' || typeof value === 'string' ? (
            animateValue ? (
              <MotionFlipNumber value={value} />
            ) : (
              <span className="tabular-nums">{value}</span>
            )
          ) : (
            value
          )}
        </p>
        {showDelta ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
              deltaUp
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/15 text-red-600 dark:text-red-400',
            )}
          >
            {deltaUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {animateValue ? (
              <MotionFlipNumber value={formatBalanceDelta(balanceDelta, balanceFormat)} />
            ) : (
              <span className="tabular-nums">{formatBalanceDelta(balanceDelta, balanceFormat)}</span>
            )}
          </span>
        ) : null}
      </div>
    </MotionReveal>
  );
}
