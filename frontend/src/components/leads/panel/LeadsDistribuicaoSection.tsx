import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { LeadsDistribuicaoGrain, LeadsOverviewResponse } from '@/types/leadsOverview';
import { formatVendasCount } from '@/lib/vendasFormat';
import { useThemeStore } from '@/store/themeStore';
import { barChartTooltipCursor, chartTooltipPanelStyle, useChartPrimaryRaw } from '@/lib/chartTheme';
import { canalColor, LEADS_FONTE_COLORS } from '@/lib/leadsPanelColors';
import { normalizeCanalBucketLabel, normalizeFonteLabel } from '@/lib/leadsCanalLabels';
import { LeadsGrainToggle } from './LeadsGrainToggle';

type LeadsDistribuicaoSectionProps = {
  distribuicao: LeadsOverviewResponse['distribuicao'] | null;
  loading?: boolean;
};

function useDarkChartTheme() {
  const { theme } = useThemeStore();
  return theme === 'dark' || theme === 'full-dark';
}

export function LeadsDistribuicaoSection({ distribuicao, loading }: LeadsDistribuicaoSectionProps) {
  const [grain, setGrain] = useState<LeadsDistribuicaoGrain>('cadastros');
  const isDark = useDarkChartTheme();
  const primaryRaw = useChartPrimaryRaw();

  const canalData = useMemo(() => {
    if (!distribuicao?.por_canal) return [];
    const merged = new Map<string, { name: string; value: number; fill: string }>();
    for (const row of distribuicao.por_canal) {
      const name = normalizeCanalBucketLabel(row.canal);
      const value = grain === 'cadastros' ? row.cadastros : row.pessoas;
      if (value <= 0) continue;
      const prev = merged.get(name);
      if (prev) prev.value += value;
      else merged.set(name, { name, value, fill: canalColor(name) });
    }
    return [...merged.values()].sort((a, b) => b.value - a.value);
  }, [distribuicao?.por_canal, grain]);

  const fonteData = useMemo(() => {
    if (!distribuicao?.por_fonte) return [];
    const merged = new Map<string, { name: string; value: number; fill: string }>();
    for (const row of distribuicao.por_fonte) {
      const name = normalizeFonteLabel(row.fonte);
      const value = grain === 'cadastros' ? row.cadastros : row.pessoas;
      if (value <= 0) continue;
      const prev = merged.get(name);
      if (prev) prev.value += value;
      else {
        merged.set(name, {
          name,
          value,
          fill: name === 'Marketing' ? LEADS_FONTE_COLORS.Marketing : LEADS_FONTE_COLORS.Externo,
        });
      }
    }
    return [...merged.values()];
  }, [distribuicao?.por_fonte, grain]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Distribuição</h2>
          <p className="text-sm text-muted-foreground">Por canal e por fonte (marketing vs externo).</p>
        </div>
        <LeadsGrainToggle value={grain} onChange={setGrain} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por canal</CardTitle>
            <CardDescription>Volume por canal provisório.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full rounded-xl" />
            ) : !canalData.length ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                Sem dados.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260} className="[&_.recharts-surface]:outline-none">
                <BarChart data={canalData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#374151' : '#e5e7eb'} />
                  <XAxis type="number" allowDecimals={false} fontSize={11} stroke={isDark ? '#9ca3af' : '#6b7280'} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    fontSize={11}
                    stroke={isDark ? '#9ca3af' : '#6b7280'}
                  />
                  <Tooltip
                    cursor={barChartTooltipCursor(isDark, primaryRaw)}
                    contentStyle={chartTooltipPanelStyle(isDark)}
                    formatter={(value) => [
                      formatVendasCount(Number(value ?? 0)),
                      grain === 'cadastros' ? 'Cadastros' : 'Pessoas',
                    ]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {canalData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Marketing vs Externo</CardTitle>
            <CardDescription>Fonte de aquisição no período.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="mx-auto h-[260px] max-w-[280px] rounded-full" />
            ) : !fonteData.length ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                Sem dados.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260} className="[&_.recharts-surface]:outline-none">
                <PieChart>
                  <Pie
                    data={fonteData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {fonteData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={chartTooltipPanelStyle(isDark)}
                    formatter={(value, name) => [
                      formatVendasCount(Number(value ?? 0)),
                      String(name ?? ''),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            {!loading && fonteData.length ? (
              <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
                {fonteData.map((row) => (
                  <span key={row.name} className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.fill }} />
                    {row.name}: {formatVendasCount(row.value)}
                  </span>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
