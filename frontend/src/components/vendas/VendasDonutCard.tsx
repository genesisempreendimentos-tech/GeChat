import { Binary, DollarSign, Info } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  formatBRLCompact,
  formatVendasBRL,
  formatVendasCount,
  formatVendasPercent,
} from '@/lib/vendasFormat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { INFOBOX_TOOLTIP_CONTENT_CLASS } from '@/components/ui/infoboxes';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/store/themeStore';
import { chartTooltipPanelStyle, chartTooltipShellStyle } from '@/lib/chartTheme';
import type { VendasDonutTailwindColor, VendasDesdobramentoViewMode } from '@/lib/vendasDesdobramento';

export type VendasDonutSlice = {
  key: string;
  label: string;
  countValue: number;
  financialValue: number;
  countWithValue: number;
  color: VendasDonutTailwindColor;
  infoTooltip?: string;
};

type VendasDonutCardProps = {
  title: string;
  infoTooltip?: string;
  centerLabel: string;
  slices: VendasDonutSlice[];
  countTotal: number;
  financialTotal: number;
  loading?: boolean;
  emptyMessage?: string;
  showViewToggle?: boolean;
};

function sliceMetric(slice: VendasDonutSlice, mode: VendasDesdobramentoViewMode): number {
  return mode === 'financial' ? slice.financialValue : slice.countValue;
}

function formatSliceMetric(value: number, mode: VendasDesdobramentoViewMode): string {
  return mode === 'financial' ? formatBRLCompact(value) : formatVendasCount(value);
}

function formatValorInformadoLine(slice: VendasDonutSlice): string {
  const pct = formatVendasPercent(slice.countWithValue, slice.countValue);
  return `Valor informado em ${formatVendasCount(slice.countWithValue)} de ${formatVendasCount(slice.countValue)} reservas. (${pct})`;
}

function financialMetricTooltipContent(value: number, slice?: VendasDonutSlice): ReactNode {
  const lines: ReactNode[] = [<span key="full">{formatVendasBRL(value)}</span>];
  if (slice && slice.countValue > 0) {
    lines.push(
      <span key="coverage" className="mt-1 block text-muted-foreground">
        {formatValorInformadoLine(slice)}
      </span>,
    );
  }
  return <>{lines}</>;
}

function FinancialMetricHover({
  value,
  slice,
  className,
  children,
}: {
  value: number;
  slice?: VendasDonutSlice;
  className?: string;
  children: ReactNode;
}) {
  return (
    <UiTooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className={cn('cursor-default tabular-nums', className)}>{children}</span>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="end"
        sideOffset={6}
        collisionPadding={20}
        className={INFOBOX_TOOLTIP_CONTENT_CLASS}
      >
        {financialMetricTooltipContent(value, slice)}
      </TooltipContent>
    </UiTooltip>
  );
}

export function VendasDonutCard({
  title,
  infoTooltip,
  centerLabel,
  slices,
  countTotal,
  financialTotal,
  loading,
  emptyMessage = 'Sem dados para exibir.',
  showViewToggle = false,
}: VendasDonutCardProps) {
  const [viewMode, setViewMode] = useState<VendasDesdobramentoViewMode>('numeral');
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || theme === 'full-dark';

  const activeTotal = viewMode === 'financial' ? financialTotal : countTotal;

  const chartData = useMemo(
    () =>
      slices
        .map((slice) => ({
          name: slice.label,
          value: sliceMetric(slice, viewMode),
          color: slice.color.fill,
        }))
        .filter((row) => row.value > 0),
    [slices, viewMode],
  );

  const centerDisplay = formatSliceMetric(activeTotal, viewMode);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <CardTitle className="text-base">{title}</CardTitle>
          {infoTooltip ? (
            <UiTooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label={`Informação: ${title}`}
                >
                  <Info className="size-3.5" strokeWidth={2.25} />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                align="start"
                sideOffset={8}
                collisionPadding={20}
                className={INFOBOX_TOOLTIP_CONTENT_CLASS}
              >
                {infoTooltip}
              </TooltipContent>
            </UiTooltip>
          ) : null}
        </div>
        {showViewToggle ? (
          <UiTooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() =>
                  setViewMode((current) => (current === 'numeral' ? 'financial' : 'numeral'))
                }
                className={cn(
                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
                  'bg-primary/10 text-primary hover:bg-primary/15',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                )}
                aria-label="Mudar os dados para numeral/financeiro"
              >
                {viewMode === 'numeral' ? (
                  <Binary className="size-4" strokeWidth={2.25} />
                ) : (
                  <DollarSign className="size-4" strokeWidth={2.25} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="end"
              sideOffset={8}
              collisionPadding={20}
              className={INFOBOX_TOOLTIP_CONTENT_CLASS}
            >
              Mudar os dados para numeral/financeiro
            </TooltipContent>
          </UiTooltip>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between pb-4">
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <Skeleton className="size-40 rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : countTotal === 0 ? (
          <p className="flex flex-1 items-center justify-center py-6 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <>
            <div className="relative mx-auto aspect-square w-full max-w-[200px] flex-1">
              <ResponsiveContainer width="100%" height="100%" className="[&_.recharts-surface]:outline-none">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="58%"
                    outerRadius="88%"
                    paddingAngle={chartData.length > 1 ? 2 : 0}
                    stroke="transparent"
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={false}
                    contentStyle={chartTooltipShellStyle()}
                    wrapperStyle={{ zIndex: 20, outline: 'none' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0];
                      const value = Number(row.value ?? 0);
                      const slice = slices.find((s) => s.label === row.name);
                      return (
                        <div
                          className="rounded-lg border px-3 py-2 text-xs shadow-lg"
                          style={chartTooltipPanelStyle(isDark)}
                        >
                          <p className="font-medium" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
                            {String(row.name)}
                          </p>
                          <p className="tabular-nums" style={{ color: isDark ? '#d1d5db' : '#6b7280' }}>
                            {viewMode === 'financial' ? (
                              <>
                                {formatVendasBRL(value)} ({formatVendasPercent(value, activeTotal)})
                                {slice && slice.countValue > 0 ? (
                                  <span className="mt-1 block opacity-80">
                                    {formatValorInformadoLine(slice)}
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <>
                                {formatSliceMetric(value, viewMode)} ({formatVendasPercent(value, activeTotal)})
                              </>
                            )}
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                {viewMode === 'financial' ? (
                  <div className="pointer-events-auto">
                    <FinancialMetricHover
                      value={financialTotal}
                      className="text-xl font-bold tracking-tight sm:text-2xl"
                    >
                      {centerDisplay}
                    </FinancialMetricHover>
                  </div>
                ) : (
                  <p className="text-xl font-bold tabular-nums tracking-tight sm:text-2xl">{centerDisplay}</p>
                )}
                <p className="mt-0.5 max-w-[8rem] text-[11px] leading-tight text-muted-foreground">
                  {centerLabel}
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {slices.map((slice) => {
                const metric = sliceMetric(slice, viewMode);
                return (
                  <li key={slice.key} className="flex items-center gap-2 text-sm">
                    <span
                      className={cn('h-2.5 w-2.5 shrink-0 rounded-full', slice.color.className)}
                    />
                    <span className="flex min-w-0 flex-1 items-center gap-1">
                      {slice.infoTooltip ? (
                        <UiTooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex min-w-0 items-center gap-1 text-left text-muted-foreground underline decoration-dotted decoration-muted-foreground/50 underline-offset-2 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              aria-label={`Informação: ${slice.label}`}
                            >
                              <span className="truncate">{slice.label}</span>
                              <Info className="size-3 shrink-0 opacity-70" strokeWidth={2.25} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            align="start"
                            sideOffset={6}
                            collisionPadding={20}
                            className={INFOBOX_TOOLTIP_CONTENT_CLASS}
                          >
                            {slice.infoTooltip}
                          </TooltipContent>
                        </UiTooltip>
                      ) : (
                        <span className="truncate text-muted-foreground">{slice.label}</span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {viewMode === 'financial' ? (
                        <FinancialMetricHover
                          value={slice.financialValue}
                          slice={slice}
                          className="font-semibold"
                        >
                          {formatSliceMetric(metric, viewMode)}
                        </FinancialMetricHover>
                      ) : (
                        <span className="font-semibold tabular-nums">
                          {formatSliceMetric(metric, viewMode)}
                        </span>
                      )}
                    </span>
                    <span className={cn('shrink-0 text-xs tabular-nums text-muted-foreground')}>
                      ({formatVendasPercent(metric, activeTotal)})
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
