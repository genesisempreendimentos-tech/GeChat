import {
  BarChart3,
  CircleCheck,
  CircleHelp,
  DollarSign,
  FileText,
  Home,
  Inbox,
  Info,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NotoEmoji } from '@/components/leads/NotoEmoji';
import { MotionReveal } from '@/components/motion/AppMotion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  buildPontuacaoDiagnostico,
  PONTUACAO_STATUS_COLORS,
  PONTUACAO_STATUS_EMOJI,
  type PontuacaoFatorIcon,
} from '@/lib/dadosPontuacao';
import type { LeadMetricsRow, LeadsInfoboxStats } from '@/lib/leadsMetrics';
import { LEADS_METRIC_TOOLTIPS } from '@/lib/leadsMetricTooltips';
import { getScoreEmoji } from '@/lib/scoreEmoji';
import { cn } from '@/lib/utils';

type SaudePeriodoStripProps = {
  stats: LeadsInfoboxStats;
  rows: LeadMetricsRow[];
};

const FATOR_LUCIDE_ICONS: Record<PontuacaoFatorIcon, LucideIcon> = {
  'trending-up': TrendingUp,
  'bar-chart-3': BarChart3,
  inbox: Inbox,
  'circle-help': CircleHelp,
  'trending-down': TrendingDown,
  star: Star,
  'file-text': FileText,
  home: Home,
  'dollar-sign': DollarSign,
  'circle-check': CircleCheck,
};

function FatorIcon({ icon }: { icon: PontuacaoFatorIcon }) {
  const Icon = FATOR_LUCIDE_ICONS[icon];
  return <Icon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2.25} aria-hidden />;
}

export function SaudePeriodoStrip({ stats, rows }: SaudePeriodoStripProps) {
  const diag = buildPontuacaoDiagnostico(rows, stats);
  const scoreEmoji = getScoreEmoji(diag.score);

  return (
    <MotionReveal index={0}>
      <div
        role="group"
        aria-label="Saúde do período"
        className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-card/60 sm:px-5 sm:py-4"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex min-w-0 shrink-0 items-center gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <NotoEmoji code={scoreEmoji.notoCode} alt={scoreEmoji.emoji} size={28} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-foreground">Saúde do período</p>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex rounded-md p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Informação: Saúde do período"
                      >
                        <Info className="size-3.5" strokeWidth={2.25} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      {LEADS_METRIC_TOOLTIPS.pontuacao}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className={cn('text-xs font-medium', PONTUACAO_STATUS_COLORS[diag.status])}>
                  <span className="mr-1" aria-hidden>
                    {PONTUACAO_STATUS_EMOJI[diag.status]}
                  </span>
                  {diag.status}
                  {scoreEmoji.label !== diag.status ? (
                    <>
                      <span className="mx-1.5 text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{scoreEmoji.label}</span>
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-md">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>Pontuação geral</span>
                <span className="tabular-nums font-semibold text-foreground">
                  {diag.score}
                  <span className="font-normal text-muted-foreground"> / 100</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-500',
                    diag.status === 'Bom'
                      ? 'bg-emerald-500'
                      : diag.status === 'Regular'
                        ? 'bg-amber-500'
                        : 'bg-red-500',
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, diag.score))}%` }}
                  role="progressbar"
                  aria-valuenow={diag.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          </div>

          {diag.fatores.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-t border-border/50 pt-3">
              {diag.fatores.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs text-foreground"
                  title={item.text}
                >
                  <FatorIcon icon={item.icon} />
                  <span className="truncate">{item.text}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </MotionReveal>
  );
}
