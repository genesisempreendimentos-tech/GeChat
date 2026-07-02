import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useThemeStore } from '@/store/themeStore';
import {
  chartPrimaryHsl,
  lineChartTooltipCursor,
  useChartPrimaryRaw,
} from '@/lib/chartTheme';
import type { AdminActivityPoint } from '@/admin/types';

function useDarkChartTheme() {
  const { theme } = useThemeStore();
  return theme === 'dark' || theme === 'full-dark';
}

function tooltipPanelStyle(isDark: boolean) {
  return {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
    borderRadius: '0.5rem' as const,
    boxShadow: isDark
      ? '0 10px 28px rgba(0, 0, 0, 0.5)'
      : '0 4px 14px rgba(0, 0, 0, 0.08)',
  };
}

export function AdminMessagesChart({ data }: { data: AdminActivityPoint[] }) {
  const isDark = useDarkChartTheme();
  const primaryRaw = useChartPrimaryRaw();
  const primaryColor = chartPrimaryHsl(primaryRaw);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>Mensagens nos últimos 7 dias</CardTitle>
        <CardDescription>Volume diário de mensagens enviadas no GêChat</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer
          width="100%"
          height={300}
          className="[&_.recharts-surface]:outline-none"
        >
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? '#374151' : '#e5e7eb'}
            />
            <XAxis
              dataKey="date"
              stroke={isDark ? '#9ca3af' : '#6b7280'}
              fontSize={12}
            />
            <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={12} allowDecimals={false} />
            <Tooltip
              cursor={lineChartTooltipCursor(isDark, primaryRaw)}
              contentStyle={tooltipPanelStyle(isDark)}
              labelStyle={{ color: isDark ? '#f3f4f6' : '#111827' }}
              itemStyle={{ color: isDark ? '#f3f4f6' : '#111827' }}
            />
            <Line
              type="monotone"
              dataKey="messages"
              name="Mensagens"
              stroke={primaryColor}
              strokeWidth={2}
              dot={{ fill: primaryColor, r: 4 }}
              activeDot={{
                r: 6,
                fill: primaryColor,
                stroke: `hsl(${primaryRaw} / ${isDark ? 0.55 : 0.45})`,
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
