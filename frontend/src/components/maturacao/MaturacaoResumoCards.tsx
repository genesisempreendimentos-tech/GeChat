import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  HandCoins,
  MessageSquare,
  Users,
} from 'lucide-react';
import { MotionFlipNumber } from '@/components/motion/AppMotion';
import { InfoBox } from '@/components/ui/infoboxes';
import type {
  MaturacaoResumoCards as MaturacaoResumoCardsData,
  MaturacaoResumoMetric,
} from '@/lib/dadosMaturacao';
import { LEADS_METRIC_TOOLTIPS } from '@/lib/leadsMetricTooltips';
import { cn } from '@/lib/utils';

type MaturacaoResumoCardsProps = {
  cards: MaturacaoResumoCardsData;
};

function formatPct(value: number): string {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function MetricTrend({ metric }: { metric: MaturacaoResumoMetric }) {
  const { pct, trend } = metric;
  const up = trend === 'up';
  const down = trend === 'down';

  if (trend === 'none') {
    return (
      <span className="shrink-0 rounded-full bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
        <MotionFlipNumber value={formatPct(pct)} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
        up && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        down && 'bg-red-500/15 text-red-600 dark:text-red-400',
        trend === 'flat' && 'bg-muted/50 text-muted-foreground',
      )}
    >
      <MotionFlipNumber value={formatPct(pct)} />
      {up ? <ArrowUp className="h-3 w-3 shrink-0" strokeWidth={2.5} /> : null}
      {down ? <ArrowDown className="h-3 w-3 shrink-0" strokeWidth={2.5} /> : null}
      {up ? 'Subiu' : down ? 'Desceu' : 'Manteve'}
    </span>
  );
}

function MetricValue({ metric }: { metric: MaturacaoResumoMetric }) {
  return (
    <span className="inline-flex w-full min-w-0 items-center justify-between gap-2 text-base font-normal">
      <span className="text-2xl font-bold leading-none tracking-tight text-foreground">
        <MotionFlipNumber value={metric.count.toLocaleString('pt-BR')} />
      </span>
      <MetricTrend metric={metric} />
    </span>
  );
}

export function MaturacaoResumoCards({ cards }: MaturacaoResumoCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <InfoBox
        title="Leads no período"
        value={<MetricValue metric={cards.leads} />}
        icon={<Users className="h-4 w-4" />}
        cor="blue"
        infoTooltip={LEADS_METRIC_TOOLTIPS.leads}
        motionIndex={0}
      />
      <InfoBox
        title="Visitas no período"
        value={<MetricValue metric={cards.visitas} />}
        icon={<CalendarCheck className="h-4 w-4" />}
        cor="violet"
        infoTooltip={LEADS_METRIC_TOOLTIPS.visitasAgendadas}
        motionIndex={1}
      />
      <InfoBox
        title="Atendimento no período"
        value={<MetricValue metric={cards.atendimento} />}
        icon={<MessageSquare className="h-4 w-4" />}
        cor="amber"
        infoTooltip={LEADS_METRIC_TOOLTIPS.atendimentoCorretor}
        motionIndex={2}
      />
      <InfoBox
        title="Vendas no período"
        value={<MetricValue metric={cards.vendas} />}
        icon={<HandCoins className="h-4 w-4" />}
        cor="emerald"
        infoTooltip={LEADS_METRIC_TOOLTIPS.vendas}
        motionIndex={3}
      />
    </div>
  );
}
