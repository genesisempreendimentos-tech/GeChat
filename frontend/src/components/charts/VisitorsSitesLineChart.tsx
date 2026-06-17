import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/store/themeStore';
import {
  chartTooltipPanelStyle,
  lineChartTooltipCursor,
  useChartPrimaryRaw,
} from '@/lib/chartTheme';
import type { LeadsTimelineSeries } from '@/lib/leadsTimelineChart';

type VisitorsSitesLineChartProps = {
  data: Record<string, string | number>[];
  xKey: string;
  series: LeadsTimelineSeries[];
  formatTooltipLabel?: (raw: unknown) => string;
  yTickFormatter?: (value: number) => string;
  tooltipValueFormatter?: (value: number) => string;
  mergeAsGesite?: boolean;
  mergeLineName?: string;
  showAverageLine?: boolean;
  averageLineName?: string;
  allPagesSelected?: boolean;
  onVisibleSeriesChange?: (keys: string[]) => void;
};

const MERGED_KEY = '__merged__';
const AVERAGE_KEY = '__average__';

function useDarkChartTheme() {
  const { theme } = useThemeStore();
  return theme === 'dark' || theme === 'full-dark';
}

export function VisitorsSitesLineChart({
  data,
  xKey,
  series,
  formatTooltipLabel,
  yTickFormatter = (v) => String(Math.round(v)),
  tooltipValueFormatter = (v) => String(Math.round(v)),
  mergeAsGesite = false,
  mergeLineName = 'Leads',
  showAverageLine = false,
  averageLineName = 'Média',
  allPagesSelected = true,
  onVisibleSeriesChange,
}: VisitorsSitesLineChartProps) {
  const isDark = useDarkChartTheme();
  const primaryRaw = useChartPrimaryRaw();
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!allPagesSelected) {
      setHiddenKeys(new Set(series.map((s) => s.dataKey)));
      return;
    }
    setHiddenKeys(new Set());
  }, [allPagesSelected, series]);

  const visibleSeries = useMemo(
    () => series.filter((s) => !hiddenKeys.has(s.dataKey)),
    [series, hiddenKeys],
  );

  useEffect(() => {
    onVisibleSeriesChange?.(visibleSeries.map((s) => s.dataKey));
  }, [visibleSeries, onVisibleSeriesChange]);

  const chartData = useMemo(() => {
    if (!mergeAsGesite && !showAverageLine) return data;

    return data.map((point) => {
      const next: Record<string, string | number> = { ...point };
      if (mergeAsGesite) {
        let total = 0;
        for (const serie of series) {
          if (hiddenKeys.has(serie.dataKey)) continue;
          const raw = point[serie.dataKey];
          total += typeof raw === 'number' ? raw : Number(raw) || 0;
        }
        next[MERGED_KEY] = total;
      }
      if (showAverageLine) {
        const active = series.filter((s) => !hiddenKeys.has(s.dataKey));
        if (!active.length) {
          next[AVERAGE_KEY] = 0;
        } else {
          const sum = active.reduce((acc, serie) => {
            const raw = point[serie.dataKey];
            return acc + (typeof raw === 'number' ? raw : Number(raw) || 0);
          }, 0);
          next[AVERAGE_KEY] = sum / active.length;
        }
      }
      return next;
    });
  }, [data, mergeAsGesite, showAverageLine, series, hiddenKeys]);

  const toggleSeries = useCallback((dataKey: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) next.delete(dataKey);
      else next.add(dataKey);
      return next;
    });
  }, []);

  const renderLegend = useCallback(
    (_props: { payload?: ReadonlyArray<{ value?: string }> }) => {
      const items: { key: string; name: string; color: string }[] = [];

      if (mergeAsGesite) {
        items.push({ key: MERGED_KEY, name: mergeLineName, color: '#14b8a6' });
      } else {
        for (const serie of series) {
          items.push({ key: serie.dataKey, name: serie.name, color: serie.color });
        }
      }
      if (showAverageLine) {
        items.push({ key: AVERAGE_KEY, name: averageLineName, color: '#14b8a6' });
      }

      return (
        <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 px-2">
          {items.map((item) => {
            const hidden = item.key !== MERGED_KEY && item.key !== AVERAGE_KEY && hiddenKeys.has(item.key);
            const inactive = item.key === AVERAGE_KEY ? false : hidden;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => {
                    if (item.key === MERGED_KEY || item.key === AVERAGE_KEY) return;
                    toggleSeries(item.key);
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-xs transition-opacity',
                    inactive ? 'opacity-40 line-through' : 'opacity-100',
                    item.key !== MERGED_KEY && item.key !== AVERAGE_KEY && 'cursor-pointer',
                  )}
                >
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </button>
              </li>
            );
          })}
        </ul>
      );
    },
    [
      averageLineName,
      hiddenKeys,
      mergeAsGesite,
      mergeLineName,
      series,
      showAverageLine,
      toggleSeries,
    ],
  );

  if (!data.length) return null;

  const activeCount = mergeAsGesite ? 1 : visibleSeries.length;

  return (
    <div className="relative">
      <ResponsiveContainer
        width="100%"
        height={280}
        className="h-[280px] sm:h-[300px] [&_.recharts-surface]:outline-none"
      >
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
          <XAxis
            dataKey={xKey}
            stroke={isDark ? '#9ca3af' : '#6b7280'}
            fontSize={11}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            stroke={isDark ? '#9ca3af' : '#6b7280'}
            fontSize={11}
            allowDecimals={false}
            tickFormatter={yTickFormatter}
          />
          <Tooltip
            cursor={lineChartTooltipCursor(isDark, primaryRaw)}
            contentStyle={chartTooltipPanelStyle(isDark)}
            labelStyle={{ color: isDark ? '#f3f4f6' : '#111827' }}
            labelFormatter={(label) => formatTooltipLabel?.(label) ?? String(label)}
            formatter={(value, name) => {
              const numeric = typeof value === 'number' ? value : Number(value ?? 0);
              const label =
                name === MERGED_KEY
                  ? mergeLineName
                  : name === AVERAGE_KEY
                    ? averageLineName
                    : series.find((s) => s.dataKey === name)?.name ?? String(name);
              return [tooltipValueFormatter(Number.isFinite(numeric) ? numeric : 0), label];
            }}
          />
          <Legend content={renderLegend} />

          {mergeAsGesite ? (
            <Line
              type="monotone"
              dataKey={MERGED_KEY}
              name={mergeLineName}
              stroke="#14b8a6"
              strokeWidth={2.5}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          ) : (
            series.map((serie) =>
              hiddenKeys.has(serie.dataKey) ? null : (
                <Line
                  key={serie.dataKey}
                  type="monotone"
                  dataKey={serie.dataKey}
                  name={serie.name}
                  stroke={serie.color}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              ),
            )
          )}

          {showAverageLine ? (
            <Line
              type="monotone"
              dataKey={AVERAGE_KEY}
              name={averageLineName}
              stroke="#14b8a6"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute bottom-1 right-2 flex gap-2 text-[10px] text-muted-foreground">
        <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 backdrop-blur-sm">
          {activeCount} {activeCount === 1 ? 'série' : 'séries'}
        </span>
        <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 backdrop-blur-sm">
          {data.length} pontos
        </span>
      </div>
    </div>
  );
}
