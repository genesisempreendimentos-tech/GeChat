import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MotionFlipNumber } from '@/components/motion/AppMotion';
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppMotion } from '@/hooks/useAppMotion';
import { cn } from '@/lib/utils';
import {
  barChartTooltipCursor,
  chartPrimaryHsl,
  lineChartTooltipCursor,
  useChartPrimaryRaw,
} from '@/lib/chartTheme';
import type {
  BarRankItem,
  CampaignRow,
  DeviceStackSegment,
  FunnelStep,
  HeatmapCell,
  VolumePoint,
} from '@/lib/dadosAggregations';
import { DADOS_TIME_RANGE_LABELS, type DadosTimeRange } from '@/lib/dadosAggregations';
import { useThemeStore } from '@/store/themeStore';

/** Animação de entrada — só quando `active`; filtros remontam o chart sem animar (evita travamento). */
function barPeriodAnimation(timeRange: DadosTimeRange, revision?: string, active = true) {
  if (!active) return { isAnimationActive: false as const };
  return {
    isAnimationActive: true,
    animationDuration: 750,
    animationBegin: 0,
    animationEasing: 'ease-in-out' as const,
    animationId: `bar-${timeRange}-${revision ?? 'default'}`,
  };
}

function linePeriodAnimation(timeRange: DadosTimeRange, revision?: string, active = true) {
  if (!active) return { isAnimationActive: false as const };
  return {
    isAnimationActive: true,
    animationDuration: 900,
    animationBegin: 0,
    animationEasing: 'ease-in-out' as const,
    animationId: `line-${timeRange}-${revision ?? 'default'}`,
  };
}

function useDarkChartTheme() {
  const { theme } = useThemeStore();
  return theme === 'dark' || theme === 'full-dark';
}

function tooltipPanelStyle(isDark: boolean) {
  return {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
    borderRadius: '0.5rem' as const,
    boxShadow: isDark ? '0 10px 28px rgba(0, 0, 0, 0.5)' : '0 4px 14px rgba(0, 0, 0, 0.08)',
  };
}

type ChartCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
  className?: string;
  compact?: boolean;
  fillHeight?: boolean;
};

function ChartCard({
  title,
  description,
  children,
  headerExtra,
  className,
  compact,
  fillHeight,
}: ChartCardProps) {
  return (
    <Card className={cn('transition-shadow hover:shadow-md', fillHeight && 'flex h-full flex-col', className)}>
      <CardHeader
        className={cn(
          'flex flex-row items-start justify-between gap-3 flex-wrap',
          compact ? 'p-4 pb-2' : undefined,
        )}
      >
        <div>
          <CardTitle className={cn(compact && 'text-base')}>{title}</CardTitle>
          {description ? (
            <CardDescription className={cn(compact && 'text-xs')}>{description}</CardDescription>
          ) : null}
        </div>
        {headerExtra}
      </CardHeader>
      <CardContent
        className={cn(compact ? 'px-4 pb-4 pt-0' : undefined, fillHeight && 'flex min-h-0 flex-1 flex-col')}
      >
        {children}
      </CardContent>
    </Card>
  );
}

function EmptyChartCard({ title, description }: { title: string; description?: string }) {
  return (
    <ChartCard title={title} description={description}>
      <p className="py-12 text-center text-sm text-muted-foreground">Sem dados no período selecionado</p>
    </ChartCard>
  );
}

export function HorizontalBarRankChart({
  data,
  title,
  description,
  valueLabel = 'Leads',
  fillHeight = false,
  className,
}: {
  data: BarRankItem[];
  title: string;
  description?: string;
  valueLabel?: string;
  fillHeight?: boolean;
  className?: string;
}) {
  if (!data.length) return <EmptyChartCard title={title} description={description} />;

  const sorted = [...data].sort((a, b) => b.value - a.value);
  const maxValue = sorted[0]?.value ?? 1;

  return (
    <ChartCard title={title} description={description} compact fillHeight={fillHeight} className={className}>
      <ul className={cn(fillHeight ? 'flex flex-1 flex-col justify-between' : 'space-y-2.5')}>
        {sorted.map((item) => {
          const widthPct =
            item.value === 0
              ? 0
              : maxValue > 0
                ? Math.max(4, (item.value / maxValue) * 100)
                : 0;
          return (
            <li key={item.name}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                <span
                  className={cn(
                    'truncate font-medium',
                    item.value === 0 ? 'text-muted-foreground' : 'text-foreground',
                  )}
                >
                  {item.name}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {item.value.toLocaleString('pt-BR')}{' '}
                  <span className="text-[10px]">({item.pct}%)</span>
                </span>
              </div>
              <UiTooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted/50"
                    role="img"
                    aria-label={`${item.name}: ${item.value} ${valueLabel}`}
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-500 ease-out"
                      style={{ width: `${widthPct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={6}
                  className={cn(
                    'border-primary/30 bg-[#111] px-3 py-1.5 text-xs text-[#c8f5f0]',
                    'shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_16px_rgba(20,184,166,0.08)]',
                  )}
                >
                  {item.name}: {item.value.toLocaleString('pt-BR')} {valueLabel} ({item.pct}%)
                </TooltipContent>
              </UiTooltip>
            </li>
          );
        })}
      </ul>
    </ChartCard>
  );
}

export function StackedPercentBarChart({
  segments,
  title,
  description,
}: {
  segments: DeviceStackSegment[];
  title: string;
  description?: string;
}) {
  if (!segments.length) return <EmptyChartCard title={title} description={description} />;

  return (
    <ChartCard title={title} description={description} compact>
      <div className="space-y-3">
        <div className="flex h-7 w-full overflow-hidden rounded-lg ring-1 ring-border/60">
          {segments.map((seg) => (
            <UiTooltip key={seg.key} delayDuration={150}>
              <TooltipTrigger asChild>
                <div
                  className="flex h-full items-center justify-center text-[9px] font-semibold text-white transition-all sm:text-[10px]"
                  style={{ width: `${seg.pct}%`, backgroundColor: seg.color, minWidth: seg.pct > 0 ? '1.25rem' : 0 }}
                >
                  {seg.pct >= 14 ? `${seg.pct}%` : null}
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                className={cn(
                  'border-primary/30 bg-[#111] px-3 py-1.5 text-xs text-[#c8f5f0]',
                  'shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_16px_rgba(20,184,166,0.08)]',
                )}
              >
                {seg.label}: {seg.value.toLocaleString('pt-BR')} ({seg.pct}%)
              </TooltipContent>
            </UiTooltip>
          ))}
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
          {segments.map((seg) => (
            <li key={seg.key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="font-medium text-foreground">{seg.label}</span>
              <span className="tabular-nums">
                {seg.value.toLocaleString('pt-BR')} · {seg.pct}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}

export function ConversionFunnelChart({
  steps,
  title,
  description,
  revision,
}: {
  steps: FunnelStep[];
  title: string;
  description?: string;
  /** Muda quando filtros/dados mudam — sincroniza animação de largura e números. */
  revision?: string;
}) {
  const motionCfg = useAppMotion();

  if (!steps.length) return <EmptyChartCard title={title} description={description} />;

  const maxValue = steps[0]?.value ?? 1;
  const blockHeight = 40;
  const minWidthPct = 62;
  const maxWidthPct = 88;

  /** Proporção suavizada (raiz) para não estreitar demais os blocos inferiores. */
  const widthFor = (value: number) => {
    if (maxValue <= 0) return minWidthPct;
    const ratio = Math.min(1, value / maxValue);
    const eased = Math.sqrt(ratio);
    return minWidthPct + eased * (maxWidthPct - minWidthPct);
  };

  let previousWidth = maxWidthPct;
  const blockWidths = steps.map((step) => {
    const next = Math.min(widthFor(step.value), previousWidth);
    previousWidth = next;
    return next;
  });

  const widthTransition = motionCfg.enabled ? motionCfg.springSoft : { duration: 0 };

  return (
    <ChartCard title={title} description={description} compact>
      <div className="mx-auto flex max-w-md items-stretch gap-2 sm:gap-3">
        <div
          className="flex min-w-0 flex-1 flex-col items-center gap-0"
          role="img"
          aria-label={`Funil: ${steps.map((s) => `${s.label} ${s.value}`).join(', ')}`}
        >
          {steps.map((step, index) => (
            <div key={step.label} className="flex w-full justify-center">
              <motion.div
                layout
                initial={false}
                animate={{ width: `${blockWidths[index]}%` }}
                transition={{ width: widthTransition, layout: widthTransition }}
                className="flex items-center justify-between gap-2 px-2.5 sm:px-3"
                style={{
                  height: blockHeight,
                  backgroundColor: step.color,
                }}
              >
                <span className="truncate text-[11px] font-semibold text-white sm:text-xs">
                  {step.label}
                </span>
                <div className="flex shrink-0 items-baseline gap-1 text-white">
                  <span className="text-[11px] font-bold tabular-nums sm:text-xs">
                    <MotionFlipNumber value={step.value.toLocaleString('pt-BR')} />
                  </span>
                  <span className="text-[10px] font-medium opacity-90">
                    <MotionFlipNumber value={`${step.pctOfFirst}%`} />
                  </span>
                </div>
              </motion.div>
            </div>
          ))}
        </div>

        <div className="hidden w-12 shrink-0 flex-col gap-0 sm:flex" aria-hidden>
          {steps.map((step, index) => (
            <div
              key={`drop-${step.label}-${revision ?? 'default'}`}
              className="flex items-center justify-center text-[10px] font-medium text-muted-foreground"
              style={{ height: blockHeight }}
            >
              {index > 0 && step.pctOfPrevious !== null ? (
                <motion.span
                  key={`${step.label}-drop-${step.pctOfPrevious}`}
                  initial={motionCfg.enabled ? { opacity: 0, y: -4 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={motionCfg.pageTransition}
                  className="rounded bg-muted/60 px-1 py-0.5 tabular-nums"
                >
                  ↓ <MotionFlipNumber value={`${step.pctOfPrevious}%`} />
                </motion.span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 pt-2.5 text-[10px] text-muted-foreground">
        {steps.map((step) => (
          <span key={step.label} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ backgroundColor: step.color }}
            />
            <span className="font-medium text-foreground">{step.label}</span>
            <span className="tabular-nums">
              <MotionFlipNumber value={`${step.pctOfFirst}%`} /> do topo
            </span>
          </span>
        ))}
      </div>
    </ChartCard>
  );
}

export function EnhancedVolumeChart({
  data,
  timeRange,
  onTimeRangeChange,
  title,
  description,
  valueLabel = 'Leads',
  previousData,
  showTrendLine = false,
  revision,
  animateEntrance = true,
}: {
  data: VolumePoint[];
  timeRange: DadosTimeRange;
  onTimeRangeChange: (range: DadosTimeRange) => void;
  title: string;
  description?: string;
  valueLabel?: string;
  previousData?: VolumePoint[];
  showTrendLine?: boolean;
  /** Remonta o gráfico ao mudar filtros/dados (evita morphing lento do Recharts). */
  revision?: string;
  /** Anima barras/linhas na entrada — desligar ao mudar só filtros. */
  animateEntrance?: boolean;
}) {
  const isDark = useDarkChartTheme();
  const primaryRaw = useChartPrimaryRaw();
  const primaryColor = chartPrimaryHsl(primaryRaw);

  const total = data.reduce((acc, p) => acc + p.leads, 0);
  const dailyAvg = data.length ? Math.round((total / data.length) * 10) / 10 : 0;
  const prevTotal = previousData?.reduce((acc, p) => acc + p.leads, 0) ?? 0;
  const deltaPct =
    prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 1000) / 10 : null;

  const chartData = data.map((point, i) => ({
    ...point,
    previous: previousData?.[i]?.leads ?? 0,
    trend: dailyAvg,
  }));

  const rangeToggle = (
    <div className="flex flex-wrap gap-1">
      {(['7', '30', '90'] as DadosTimeRange[]).map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => onTimeRangeChange(range)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            timeRange === range
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          {DADOS_TIME_RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  );

  return (
    <ChartCard
      title={title}
      description={description}
      headerExtra={rangeToggle}
    >
      <div className="mb-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>
          Total: <strong className="text-foreground">{total.toLocaleString('pt-BR')}</strong>
        </span>
        <span>
          Média/dia: <strong className="text-foreground">{dailyAvg.toLocaleString('pt-BR')}</strong>
        </span>
        {deltaPct !== null ? (
          <span>
            vs. período anterior:{' '}
            <strong className={deltaPct >= 0 ? 'text-emerald-500' : 'text-red-500'}>
              {deltaPct >= 0 ? '+' : ''}
              {deltaPct}%
            </strong>
          </span>
        ) : null}
      </div>
      <ResponsiveContainer width="100%" height={280} className="[&_.recharts-surface]:outline-none">
        <ComposedChart
          key={`volume-${revision ?? 'default'}-${timeRange}-${chartData.length}`}
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
        >
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
            <XAxis
              dataKey="date"
              stroke={isDark ? '#9ca3af' : '#6b7280'}
              fontSize={11}
              interval={timeRange === '90' ? 6 : timeRange === '30' ? 2 : 0}
            />
            <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={11} allowDecimals={false} />
            <Tooltip
              cursor={barChartTooltipCursor(isDark, primaryRaw)}
              contentStyle={tooltipPanelStyle(isDark)}
              labelStyle={{ color: isDark ? '#f3f4f6' : '#111827' }}
              formatter={(value, name) => {
                const numeric = typeof value === 'number' ? value : Number(value ?? 0);
                const labels: Record<string, string> = {
                  leads: valueLabel,
                  previous: 'Período anterior',
                  trend: 'Média diária',
                };
                return [Number.isFinite(numeric) ? numeric : 0, labels[String(name)] ?? String(name)];
              }}
            />
            <Bar
              {...barPeriodAnimation(timeRange, revision, animateEntrance)}
              dataKey="leads"
              fill={primaryColor}
              radius={[4, 4, 0, 0]}
              name="leads"
              activeBar={
                isDark
                  ? { fill: 'hsl(var(--chart-bar-active))', radius: 4 }
                  : { fill: primaryColor, opacity: 0.88, radius: 4 }
              }
            />
            {previousData?.length ? (
              <Line
                {...linePeriodAnimation(timeRange, revision, animateEntrance)}
                type="monotone"
                dataKey="previous"
                stroke={isDark ? '#94a3b8' : '#64748b'}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                name="previous"
              />
            ) : null}
            {showTrendLine ? (
              <Line
                {...linePeriodAnimation(timeRange, revision, animateEntrance)}
                type="monotone"
                dataKey="trend"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="trend"
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
    </ChartCard>
  );
}

export function ChannelTrendLineChart({
  data,
  channels,
  channelColors,
  timeRange,
  onTimeRangeChange,
  title,
  description,
  revision,
  animateEntrance = true,
}: {
  data: Record<string, number | string>[];
  channels: string[];
  channelColors: Record<string, string>;
  timeRange: DadosTimeRange;
  onTimeRangeChange: (range: DadosTimeRange) => void;
  title: string;
  description?: string;
  revision?: string;
  animateEntrance?: boolean;
}) {
  const isDark = useDarkChartTheme();
  const primaryRaw = useChartPrimaryRaw();

  if (!channels.length) return <EmptyChartCard title={title} description={description} />;

  const rangeToggle = (
    <div className="flex flex-wrap gap-1">
      {(['7', '30', '90'] as DadosTimeRange[]).map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => onTimeRangeChange(range)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            timeRange === range
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          {DADOS_TIME_RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  );

  return (
    <ChartCard title={title} description={description} headerExtra={rangeToggle}>
      <ResponsiveContainer width="100%" height={300} className="[&_.recharts-surface]:outline-none">
        <ComposedChart
          key={`channel-${revision ?? 'default'}-${timeRange}-${data.length}`}
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
          <XAxis
            dataKey="date"
            stroke={isDark ? '#9ca3af' : '#6b7280'}
            fontSize={11}
            interval={timeRange === '90' ? 6 : timeRange === '30' ? 2 : 0}
          />
          <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={11} allowDecimals={false} />
          <Tooltip
            cursor={lineChartTooltipCursor(isDark, primaryRaw)}
            contentStyle={tooltipPanelStyle(isDark)}
            labelStyle={{ color: isDark ? '#f3f4f6' : '#111827' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {channels.map((ch) => (
            <Line
              key={ch}
              {...linePeriodAnimation(timeRange, revision, animateEntrance)}
              type="monotone"
              dataKey={ch}
              stroke={channelColors[ch] ?? '#94a3b8'}
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
              name={ch}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function CampaignPerformanceTable({
  rows,
  title,
  description,
}: {
  rows: CampaignRow[];
  title: string;
  description?: string;
}) {
  if (!rows.length) return <EmptyChartCard title={title} description={description} />;

  return (
    <ChartCard title={title} description={description} compact>
      <div className="overflow-x-auto rounded-lg border border-border/70">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] text-muted-foreground">
              <th className="px-3 py-2 font-medium">Origem</th>
              <th className="px-3 py-2 font-medium">Leads</th>
              <th className="px-3 py-2 font-medium">Conv.</th>
              <th className="px-3 py-2 font-medium">Taxa</th>
              <th className="px-3 py-2 font-medium">CPL</th>
              <th className="px-3 py-2 font-medium">CPC</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.origem} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 text-xs font-medium">{row.origem}</td>
                <td className="px-3 py-2 text-xs tabular-nums">{row.leads.toLocaleString('pt-BR')}</td>
                <td className="px-3 py-2 text-xs tabular-nums">{row.conversoes.toLocaleString('pt-BR')}</td>
                <td className="px-3 py-2 text-xs tabular-nums">{row.taxaConversaoPct}%</td>
                <td className="px-3 py-2 text-xs tabular-nums">
                  {row.cpl > 0 ? `R$ ${row.cpl.toFixed(2)}` : '—'}
                </td>
                <td className="px-3 py-2 text-xs tabular-nums">
                  {row.cpc > 0 ? `R$ ${row.cpc.toFixed(2)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

const DAY_LABELS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const DAY_LABELS_FULL = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

function HeatmapCellButton({
  dayIndex,
  hour,
  value,
  max,
  isDark,
  intensity,
}: {
  dayIndex: number;
  hour: number;
  value: number;
  max: number;
  isDark: boolean;
  intensity: (value: number) => string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const dayLabel = DAY_LABELS_FULL[dayIndex] ?? DAY_LABELS_SHORT[dayIndex];

  return (
    <UiTooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-5 w-full items-center justify-center rounded-sm text-[9px] font-medium tabular-nums transition-all sm:h-6',
            'hover:ring-2 hover:ring-primary/40 hover:ring-offset-1 hover:ring-offset-background',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          )}
          style={{
            backgroundColor: intensity(value),
            color: value > max * 0.55 ? '#fff' : isDark ? '#e5e7eb' : '#374151',
          }}
          aria-label={`${dayLabel} ${hour}h — ${value} leads`}
        >
          {value > 0 && value >= max * 0.25 ? value : ''}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        collisionPadding={12}
        className={cn(
          'border-primary/30 bg-[#111] px-3.5 py-2 text-xs font-normal text-[#c8f5f0]',
          'shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_16px_rgba(20,184,166,0.08)]',
        )}
      >
        <p className="font-medium">{dayLabel}</p>
        <p className="mt-0.5 tabular-nums">
          {String(hour).padStart(2, '0')}:00 —{' '}
          <span className="font-semibold text-white">{value.toLocaleString('pt-BR')}</span> leads
        </p>
        {value > 0 ? (
          <p className="mt-0.5 text-[10px] text-[#c8f5f0]/75">{pct}% do horário de pico</p>
        ) : (
          <p className="mt-0.5 text-[10px] text-[#c8f5f0]/75">Nenhum lead neste horário</p>
        )}
      </TooltipContent>
    </UiTooltip>
  );
}

export function LeadHeatmapChart({
  cells,
  title,
  description,
}: {
  cells: HeatmapCell[];
  title: string;
  description?: string;
}) {
  const isDark = useDarkChartTheme();
  if (!cells.length) return <EmptyChartCard title={title} description={description} />;

  const max = Math.max(1, ...cells.map((c) => c.value));
  const days = [1, 2, 3, 4, 5, 6, 0];
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);

  const valueAt = (dayIndex: number, hour: number) =>
    cells.find((c) => c.dayIndex === dayIndex && c.hour === hour)?.value ?? 0;

  const intensity = (value: number) => {
    const t = value / max;
    if (isDark) return `hsl(173 80% ${Math.round(18 + t * 42)}%)`;
    return `hsl(173 70% ${Math.round(88 - t * 48)}%)`;
  };

  return (
    <ChartCard title={title} description={description}>
      <div className="mx-auto w-full max-w-md overflow-x-auto lg:max-w-none">
        <div className="grid grid-cols-[2rem_repeat(7,minmax(0,1fr))] gap-0.5 text-[9px] sm:max-w-lg">
          <div />
          {days.map((d) => (
            <div key={d} className="py-0.5 text-center font-medium text-muted-foreground">
              {DAY_LABELS_SHORT[d]}
            </div>
          ))}
          {hours.map((hour) => (
            <div key={`row-${hour}`} className="contents">
              <div className="flex h-5 items-center justify-end pr-1 text-[9px] text-muted-foreground sm:h-6">
                {String(hour).padStart(2, '0')}h
              </div>
              {days.map((dayIndex) => {
                const value = valueAt(dayIndex, hour);
                return (
                  <HeatmapCellButton
                    key={`${dayIndex}-${hour}`}
                    dayIndex={dayIndex}
                    hour={hour}
                    value={value}
                    max={max}
                    isDark={isDark}
                    intensity={intensity}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Passe o mouse sobre uma célula para ver o detalhe. Cor mais intensa = mais leads.
      </p>
    </ChartCard>
  );
}
