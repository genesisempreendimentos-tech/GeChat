import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { VendasTopItem } from '@/types/vendas';
import { formatVendasBRL, formatVendasBRLCompact } from '@/lib/vendasFormat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useThemeStore } from '@/store/themeStore';
import {
  barChartTooltipCursor,
  chartPrimaryHsl,
  useChartPrimaryRaw,
} from '@/lib/chartTheme';

type VendasTopRankingChartProps = {
  title: string;
  description: string;
  items: VendasTopItem[];
  loading?: boolean;
  limit?: number;
};

function tooltipPanelStyle(isDark: boolean) {
  return {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
    borderRadius: '0.5rem' as const,
    boxShadow: isDark ? '0 10px 28px rgba(0, 0, 0, 0.5)' : '0 4px 14px rgba(0, 0, 0, 0.08)',
  };
}

export function VendasTopRankingChart({
  title,
  description,
  items,
  loading,
  limit = 10,
}: VendasTopRankingChartProps) {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || theme === 'full-dark';
  const primaryRaw = useChartPrimaryRaw();
  const primaryColor = chartPrimaryHsl(primaryRaw);

  const chartData = items
    .filter((item) => item.valor > 0)
    .slice(0, limit)
    .map((item) => ({
      name: item.label,
      valor: item.valor,
      vendas: item.vendas,
    }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : !chartData.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhum resultado para exibir neste recorte.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 36)} className="[&_.recharts-surface]:outline-none">
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} horizontal={false} />
              <XAxis
                type="number"
                stroke={isDark ? '#9ca3af' : '#6b7280'}
                fontSize={11}
                tickFormatter={(v) => formatVendasBRLCompact(Number(v))}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                stroke={isDark ? '#9ca3af' : '#6b7280'}
                fontSize={11}
                tick={{ fill: isDark ? '#d1d5db' : '#374151' }}
              />
              <Tooltip
                cursor={barChartTooltipCursor(isDark, primaryRaw)}
                contentStyle={tooltipPanelStyle(isDark)}
                labelStyle={{ color: isDark ? '#f3f4f6' : '#111827' }}
                formatter={(value) => [formatVendasBRL(Number(value ?? 0)), 'Valor']}
              />
              <Bar dataKey="valor" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? primaryColor : `hsl(${primaryRaw} / ${isDark ? 0.45 : 0.35})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
