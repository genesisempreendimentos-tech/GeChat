import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  LayoutDashboard,
  Users,
  Shield,
  Activity,
  TrendingUp,
  Star,
  Boxes,
} from 'lucide-react';
import { MainViewHeader } from '@/components/layout/header';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { AdminBigBox } from '@/admin/components/AdminBigBox';
import { databaseService } from '@/services/supabase';
import { LoadingGifScreen } from '@/components/LoadingGif';
import { DonutChart } from '@/components/Charts';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useThemeStore } from '@/store/themeStore';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdminCounts {
  users: number;
  softadmins: number;
  apps: number;
  activeApps: number;
}

type TimeRange = '7' | '30' | '90';

export default function AdminDashboardPage() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || theme === 'full-dark';
  const primaryColor = 'hsl(var(--primary))';

  const [counts, setCounts] = useState<AdminCounts | null>(null);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('7');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [c, { data: logs }] = await Promise.all([
        databaseService.getAdminCounts(),
        databaseService.getAccessLogsAll(2000),
      ]);
      setCounts(c as AdminCounts);
      setAccessLogs(logs || []);
      setLoading(false);
    };
    load();
  }, []);

  const donutData = useMemo(() => {
    if (!counts) return [];
    return [
      { name: 'Apps ativos', value: counts.activeApps },
      { name: 'Outros', value: Math.max(0, counts.apps - counts.activeApps) },
    ].filter((d) => d.value > 0);
  }, [counts]);

  const barData = useMemo(() => {
    const days = timeRange === '7' ? 7 : timeRange === '30' ? 30 : 90;
    const range = Array.from({ length: days }, (_, i) => {
      const d = subDays(new Date(), days - 1 - i);
      return {
        date: format(d, 'dd/MM', { locale: ptBR }),
        fullDate: startOfDay(d).getTime(),
        acessos: 0,
      };
    });
    accessLogs.forEach((log: any) => {
      const ts = log.timestamp ?? log.created_at;
      if (!ts) return;
      const t = startOfDay(new Date(ts)).getTime();
      const row = range.find((r) => r.fullDate === t);
      if (row) row.acessos++;
    });
    return range.map(({ date, acessos }) => ({ date, acessos }));
  }, [accessLogs, timeRange]);

  const topAppsByAccess = useMemo(() => {
    const byApp: Record<string, { name: string; count: number }> = {};
    accessLogs.forEach((log: any) => {
      const id = log.systemId ?? log.app_id;
      if (!id) return;
      if (!byApp[id]) {
        byApp[id] = {
          name: log.systemName ?? log.systems?.name ?? 'App',
          count: 0,
        };
      }
      byApp[id].count++;
    });
    return Object.entries(byApp)
      .map(([id, { name, count }]) => ({ id, name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [accessLogs]);

  if (loading) {
    return (
      <MainViewFluidShell>
      <div className="space-y-6">
        <MainViewHeader
          icon={<LayoutDashboard className="h-6 w-6" />}
          title="Dashboard"
          description="Visão geral do painel administrativo."
        />
        <AdminBigBox>
          <LoadingGifScreen className="h-48" />
        </AdminBigBox>
      </div>
      </MainViewFluidShell>
    );
  }

  return (
    <MainViewFluidShell>
    <div className="space-y-6">
      <MainViewHeader
        icon={<LayoutDashboard className="h-6 w-6" />}
        title="Dashboard"
        description="Visão geral do painel administrativo."
      />

      <AdminBigBox>
        {/* 4 métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Usuários</CardTitle>
                <Users className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{counts?.users ?? 0}</p>
                <p className="text-xs text-muted-foreground">Membros cadastrados</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Administradores</CardTitle>
                <Shield className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{counts?.softadmins ?? 0}</p>
                <p className="text-xs text-muted-foreground">Apps admin</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Apps ativos</CardTitle>
                <Activity className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{counts?.activeApps ?? 0}</p>
                <p className="text-xs text-muted-foreground">Status ativo/beta</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Apps totais</CardTitle>
                <Boxes className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{counts?.apps ?? 0}</p>
                <p className="text-xs text-muted-foreground">Sistemas cadastrados</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Gráficos: Donut + Bar com filtro */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {donutData.length > 0 && (
            <DonutChart
              data={donutData}
              title="Apps ativos vs totais"
              description="Proporção de apps ativos"
            />
          )}
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle>Acessos totais</CardTitle>
                <CardDescription>Acessos de todos os apps por dia</CardDescription>
              </div>
              <div className="flex flex-wrap gap-1">
                {(['7', '30', '90'] as TimeRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      timeRange === r
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    {r} dias
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                  <XAxis dataKey="date" stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={11} />
                  <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1f2937' : '#ffffff',
                      border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '0.5rem',
                    }}
                    labelStyle={{ color: isDark ? '#f3f4f6' : '#111827' }}
                  />
                  <Bar
                    dataKey="acessos"
                    fill={primaryColor}
                    radius={[4, 4, 0, 0]}
                    name="Acessos"
                    activeBar={
                      isDark
                        ? { fill: 'hsl(var(--chart-bar-active))', radius: 4 }
                        : true
                    }
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Apps mais acessados
              </CardTitle>
              <CardDescription>Top 5 por número de acessos</CardDescription>
            </CardHeader>
            <CardContent>
              {topAppsByAccess.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nenhum acesso registrado ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {topAppsByAccess.map((app, i) => (
                    <li
                      key={app.id}
                      className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                    >
                      <span className="font-medium text-sm">
                        {i + 1}. {app.name}
                      </span>
                      <span className="text-muted-foreground text-sm">{app.count} acessos</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Apps mais bem avaliados
              </CardTitle>
              <CardDescription>Ranking por avaliação (em breve)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground py-4">
                Esta métrica estará disponível quando o sistema de avaliações for ativado.
              </p>
            </CardContent>
          </Card>
        </div>
      </AdminBigBox>
    </div>
    </MainViewFluidShell>
  );
}
