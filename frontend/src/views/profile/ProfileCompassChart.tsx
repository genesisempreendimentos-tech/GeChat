import { useMemo } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Compass } from 'lucide-react';

export interface CategoryCount {
  category: string;
  count: number;
}

interface ProfileCompassChartProps {
  categoryCounts: CategoryCount[];
}

const BRAND_COLOR = '#1A9386';

export function ProfileCompassChart({ categoryCounts }: ProfileCompassChartProps) {
  const chartData = useMemo(() => {
    if (!categoryCounts?.length) return [];
    const max = Math.max(...categoryCounts.map((c) => c.count), 1);
    return categoryCounts.slice(0, 8).map((item) => ({
      subject: item.category,
      value: max > 0 ? Math.round((item.count / max) * 100) : 0,
      fullMark: 100,
    }));
  }, [categoryCounts]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="w-5 h-5" />
            Sistemas por categoria
          </CardTitle>
          <CardDescription>Distribuição dos sistemas por categoria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
            Nenhum dado disponível.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="w-5 h-5" />
          Sistemas por categoria
        </CardTitle>
        <CardDescription>Distribuição dos sistemas por categoria</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            />
            <Radar
              name="Sistemas"
              dataKey="value"
              stroke={BRAND_COLOR}
              fill={BRAND_COLOR}
              fillOpacity={0.4}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value) => {
                const numeric = typeof value === 'number' ? value : Number(value ?? 0);
                const safe = Number.isFinite(numeric) ? numeric : 0;
                return [`${safe}%`, 'Peso'];
              }}
              labelFormatter={(label) => label}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
