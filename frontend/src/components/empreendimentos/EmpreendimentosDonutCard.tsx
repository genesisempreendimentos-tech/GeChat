import { Info } from 'lucide-react';
import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatVendasCount, formatVendasPercent } from '@/lib/vendasFormat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { INFOBOX_TOOLTIP_CONTENT_CLASS } from '@/components/ui/infoboxes';
import { useThemeStore } from '@/store/themeStore';
import { chartTooltipPanelStyle, chartTooltipShellStyle } from '@/lib/chartTheme';

export type EmpreendimentosDonutSlice = {
  key: string;
  label: string;
  count: number;
  color: string;
};

type EmpreendimentosDonutCardProps = {
  title: string;
  infoTooltip?: string;
  centerLabel: string;
  slices: EmpreendimentosDonutSlice[];
  total: number;
  loading?: boolean;
  emptyMessage?: string;
};

export function EmpreendimentosDonutCard({
  title,
  infoTooltip,
  centerLabel,
  slices,
  total,
  loading,
  emptyMessage = 'Sem dados para exibir.',
}: EmpreendimentosDonutCardProps) {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || theme === 'full-dark';

  const chartData = useMemo(
    () =>
      slices
        .map((slice) => ({
          name: slice.label,
          value: slice.count,
          color: slice.color,
        }))
        .filter((row) => row.value > 0),
    [slices],
  );

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
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pb-4">
        {loading ? (
          <Skeleton className="mx-auto aspect-square w-full max-w-[220px] flex-1 rounded-full" />
        ) : chartData.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-10 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <>
            <div className="relative mx-auto aspect-square w-full max-w-[220px] flex-1">
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
                      return (
                        <div
                          className="rounded-lg border px-3 py-2 text-xs shadow-lg"
                          style={chartTooltipPanelStyle(isDark)}
                        >
                          <p className="font-medium" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
                            {String(row.name)}
                          </p>
                          <p className="tabular-nums" style={{ color: isDark ? '#d1d5db' : '#6b7280' }}>
                            {formatVendasCount(value)} ({formatVendasPercent(value, total)})
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-xl font-bold tabular-nums tracking-tight sm:text-2xl">
                  {formatVendasCount(total)}
                </p>
                <p className="mt-0.5 max-w-[8rem] text-[11px] leading-tight text-muted-foreground">
                  {centerLabel}
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-1.5">
              <li
                aria-hidden
                className="grid grid-cols-[auto_minmax(0,1fr)_4.5rem_3.5rem] items-center gap-x-3 px-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70"
              >
                <span className="col-span-2" />
                <span className="text-right">Número</span>
                <span className="text-right">Percentual</span>
              </li>
              {slices.map((slice) => (
                <li
                  key={slice.key}
                  className="grid grid-cols-[auto_minmax(0,1fr)_4.5rem_3.5rem] items-center gap-x-3 text-sm"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="min-w-0 truncate text-foreground">{slice.label}</span>
                  <span className="text-right tabular-nums text-foreground">
                    {formatVendasCount(slice.count)}
                  </span>
                  <span className="text-right tabular-nums text-muted-foreground">
                    {formatVendasPercent(slice.count, total)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
