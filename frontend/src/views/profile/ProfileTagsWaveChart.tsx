import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tags } from 'lucide-react';

export interface CategoryCount {
  category: string;
  count: number;
}

interface ProfileTagsWaveChartProps {
  categoryCounts: CategoryCount[];
}

const BRAND_COLOR = '#1A9386';

export function ProfileTagsWaveChart({ categoryCounts }: ProfileTagsWaveChartProps) {
  const chartData =
    categoryCounts?.length > 0
      ? categoryCounts.slice(0, 8).map((item) => ({
          name: item.category,
          quantidade: item.count,
        }))
      : [];

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="w-5 h-5" />
            Atividade por categoria
          </CardTitle>
          <CardDescription>Quantidade de sistemas por categoria</CardDescription>
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
          <Tags className="w-5 h-5" />
          Atividade por categoria
        </CardTitle>
        <CardDescription>Quantidade de sistemas por categoria</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 20, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="colorQuantidade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={BRAND_COLOR} stopOpacity={0.4} />
                <stop offset="95%" stopColor={BRAND_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value) => {
                const numeric = typeof value === 'number' ? value : Number(value ?? 0);
                return [Number.isFinite(numeric) ? numeric : 0, 'Sistemas'];
              }}
            />
            <Area
              type="monotone"
              dataKey="quantidade"
              stroke={BRAND_COLOR}
              strokeWidth={2}
              fill="url(#colorQuantidade)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
