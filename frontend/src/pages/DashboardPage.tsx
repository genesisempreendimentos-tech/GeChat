import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus, TrendingUp, ArrowRight, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DonutChart, LeadsVolumeChart } from '@/components/Charts';
import { DashboardLeadsPanel } from '@/components/dashboard/DashboardLeadsPanel';
import { LoadingGifScreen } from '@/components/LoadingGif';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { MainViewHeader } from '@/components/layout/header';
import {
  aggregateLeadsByDay,
  dashboardTimeRangeDays,
  filterLeadsInRange,
  leadsBySourceDonut,
  leadsByStatusDonut,
  type DashboardTimeRange,
} from '@/lib/dashboardLeadsMetrics';
import { leadsService } from '@/services/leadsService';
import type { Lead, LeadStats } from '@/types/lead';
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from '@/types/lead';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>('90');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [statsRes, leadsRes] = await Promise.all([leadsService.getStats(), leadsService.list()]);
      if (statsRes.error || leadsRes.error) {
        setError(statsRes.error ?? leadsRes.error ?? 'Erro ao carregar dados.');
      } else {
        const leads = leadsRes.data ?? [];
        setStats(statsRes.data);
        setAllLeads(leads);
        setRecentLeads(leads.slice(0, 5));
        setError('');
      }
      setLoading(false);
    }
    void load();
  }, []);

  const rangedLeads = useMemo(
    () => filterLeadsInRange(allLeads, dashboardTimeRangeDays(timeRange)),
    [allLeads, timeRange],
  );

  const volumeData = useMemo(
    () => aggregateLeadsByDay(rangedLeads, dashboardTimeRangeDays(timeRange)),
    [rangedLeads, timeRange],
  );

  const statusDonut = useMemo(() => leadsByStatusDonut(rangedLeads), [rangedLeads]);
  const sourceDonut = useMemo(() => leadsBySourceDonut(rangedLeads), [rangedLeads]);

  if (loading) return <LoadingGifScreen />;

  return (
    <MainViewFluidShell>
      <MainViewHeader
        icon={<Users className="h-6 w-6" />}
        title="Dashboard"
        description="Visão geral do acompanhamento de leads"
      />
      <motion.div variants={container} initial="hidden" animate="show" className="mt-6 space-y-6">
        {error && (
          <motion.div variants={item}>
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Novos hoje</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.newToday ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Qualificados</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.byStatus?.qualificado ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ganhos</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats?.byStatus?.ganho ?? 0}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="grid gap-6 lg:grid-cols-2">
          {statusDonut.length > 0 ? (
            <DonutChart
              data={statusDonut}
              title="Pipeline por status"
              description="Distribuição dos leads no funil comercial"
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Pipeline por status</CardTitle>
                <CardDescription>Sem dados no período selecionado</CardDescription>
              </CardHeader>
            </Card>
          )}
          {sourceDonut.length > 0 ? (
            <DonutChart
              data={sourceDonut}
              title="Leads por origem"
              description="De onde vieram os leads capturados"
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Leads por origem</CardTitle>
                <CardDescription>Sem dados no período selecionado</CardDescription>
              </CardHeader>
            </Card>
          )}
        </motion.div>

        <motion.div variants={item}>
          <LeadsVolumeChart
            data={volumeData}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            title="Volume de leads"
            description="Novos leads por dia — padrão nos últimos 3 meses"
          />
        </motion.div>

        <motion.div variants={item}>
          <DashboardLeadsPanel key={timeRange} leads={rangedLeads} />
        </motion.div>

        <motion.div variants={item} className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Resumo do pipeline
              </CardTitle>
              <CardDescription>Contagem por estágio no período</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats &&
                Object.entries(stats.byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <Badge className={LEAD_STATUS_COLORS[status as keyof typeof LEAD_STATUS_COLORS]}>
                      {LEAD_STATUS_LABELS[status as keyof typeof LEAD_STATUS_LABELS]}
                    </Badge>
                    <span className="font-medium tabular-nums">{count}</span>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Leads recentes</CardTitle>
                <CardDescription>Últimos cadastrados</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/leads">
                  Ver todos
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum lead cadastrado ainda.</p>
              ) : (
                <ul className="space-y-3">
                  {recentLeads.map((lead) => (
                    <li key={lead.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{lead.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{lead.email ?? lead.phone ?? '—'}</p>
                      </div>
                      <Badge className={LEAD_STATUS_COLORS[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </MainViewFluidShell>
  );
}
