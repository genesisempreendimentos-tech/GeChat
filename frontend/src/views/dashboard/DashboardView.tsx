import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  FileBarChart,
  HandCoins,
  MessageCircleCheck,
  MonitorSmartphone,
  Users,
} from 'lucide-react';
import { DonutChart, LeadsVolumeChart } from '@/components/Charts';
import { ScoreGaugeChart } from '@/components/charts/ScoreGaugeChart';
import { InfoBox } from '@/components/ui/infoboxes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MotionReveal } from '@/components/motion/AppMotion';
import { useAuthStore } from '@/store/authStore';
import {
  aggregateByDay,
  byOrigemDonut,
  byQualificacaoDonut,
  filterRowsInDays,
} from '@/lib/dadosAggregations';
import { computeLeadsInfoboxStats } from '@/lib/leadsMetrics';
import { LEADS_METRIC_TOOLTIPS } from '@/lib/leadsMetricTooltips';
import { LEADS_TABLE_MOCK } from '@/lib/leadsMockData';
import { DASHBOARD_LEADS, MOCK_ACTIVITIES } from '@/mock/leadsData';
import { LEAD_SOURCE_LABELS } from '@/lib/dashboardLeadsMetrics';
import { LEAD_STATUS_LABELS } from '@/types/lead';
import type { LeadStatus } from '@/types/lead';
import { cn } from '@/lib/utils';
import { startOfDay } from 'date-fns';

type VolumeRange = '7' | '30' | '90';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  creator: 'Gestor',
  user: 'Corretor',
};

const SHORTCUTS = [
  { path: '/leads', label: 'Leads', description: 'Gestão operacional', icon: Users },
  { path: '/dados', label: 'Dados', description: 'Analytics completos', icon: BarChart3 },
  { path: '/relatorios', label: 'Relatórios', description: 'Exportações e resumos', icon: FileBarChart },
  { path: '/notifications', label: 'Notificações', description: 'Alertas e avisos', icon: Bell },
] as const;

function dashboardGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function userInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function countLeadsToday(rows: typeof LEADS_TABLE_MOCK): number {
  const today = startOfDay(new Date()).getTime();
  return rows.filter((row) => startOfDay(new Date(row.dataHora)).getTime() === today).length;
}

export function DashboardView() {
  const user = useAuthStore((s) => s.user);
  const [timeRange, setTimeRange] = useState<VolumeRange>('30');
  const days = timeRange === '7' ? 7 : timeRange === '30' ? 30 : 90;

  const rangedRows = useMemo(
    () => filterRowsInDays(LEADS_TABLE_MOCK, days),
    [days],
  );

  const infoboxStats = useMemo(() => computeLeadsInfoboxStats(rangedRows), [rangedRows]);
  const newToday = useMemo(() => countLeadsToday(LEADS_TABLE_MOCK), []);
  const volumeData = useMemo(
    () => aggregateByDay(rangedRows, 'leads', days),
    [rangedRows, days],
  );
  const qualificacaoDonut = useMemo(() => byQualificacaoDonut(rangedRows), [rangedRows]);
  const origemDonut = useMemo(() => byOrigemDonut(rangedRows), [rangedRows]);

  const attentionLeads = useMemo(() => {
    const pendingProfile = LEADS_TABLE_MOCK.filter((row) => row.qualificacao === 'Indefinida')
      .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
      .slice(0, 4);

    const pipelineHot = DASHBOARD_LEADS.filter(
      (lead) => lead.status === 'novo' || lead.status === 'contato',
    )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);

    return { pendingProfile, pipelineHot };
  }, []);

  const recentActivity = useMemo(() => {
    return MOCK_ACTIVITIES.map((activity) => {
      const lead = DASHBOARD_LEADS.find((l) => l.id === activity.leadId);
      return {
        ...activity,
        leadName: lead?.name ?? 'Lead',
      };
    });
  }, []);

  const displayName = user?.name?.split(/\s+/)[0] ?? 'usuário';
  const roleLabel = ROLE_LABELS[user?.role ?? 'user'] ?? 'Usuário';

  return (
    <div className="flex flex-col gap-8">
      <MotionReveal index={0}>
        <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar className="h-12 w-12 border border-primary/20">
                {user?.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {userInitials(user?.name ?? 'GL')}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-lg font-semibold tracking-tight md:text-xl">
                  {dashboardGreeting()}, {displayName}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {roleLabel} · resumo dos últimos {days} dias
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {newToday} {newToday === 1 ? 'lead novo hoje' : 'leads novos hoje'}
              </span>
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5" asChild>
                <Link to="/dados">
                  Ver analytics
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </MotionReveal>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(12rem,1fr)] xl:items-stretch">
        <InfoBox
          motionIndex={1}
          title="Leads"
          value={infoboxStats.leads}
          icon={<Users />}
          cor="emerald"
          infoTooltip={LEADS_METRIC_TOOLTIPS.leads}
        />
        <InfoBox
          motionIndex={2}
          title="Taxa de Conversão"
          value={`${infoboxStats.taxaConversaoPct}%`}
          icon={<MonitorSmartphone />}
          cor="violet"
          infoTooltip={LEADS_METRIC_TOOLTIPS.taxaConversao}
        />
        <InfoBox
          motionIndex={3}
          title="Vendas"
          value={infoboxStats.vendas}
          icon={<HandCoins />}
          cor="amber"
          infoTooltip={LEADS_METRIC_TOOLTIPS.vendas}
        />
        <InfoBox
          motionIndex={4}
          title="WhatsApp"
          value={infoboxStats.whatsapp}
          icon={<MessageCircleCheck />}
          cor="blue"
          infoTooltip={LEADS_METRIC_TOOLTIPS.whatsapp}
        />
        <MotionReveal
          index={5}
          className="flex min-h-[8.5rem] flex-col gap-2 rounded-2xl border border-border/70 bg-card/80 px-4 py-4 shadow-sm backdrop-blur-sm sm:col-span-2 xl:col-span-1 xl:min-h-0"
        >
          <p className="text-sm font-medium text-muted-foreground">Pontuação</p>
          <div className="flex flex-1 items-center justify-center">
            <ScoreGaugeChart value={infoboxStats.pontuacao} className="w-full max-w-[9rem]" />
          </div>
        </MotionReveal>
      </div>

      <LeadsVolumeChart
        data={volumeData}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        title="Leads capturados"
        description={`Volume diário no seu workspace · ${days} dias`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DonutChart
          data={qualificacaoDonut}
          title="Qualificação"
          description="Distribuição por nível de qualificação no período"
          size="lg"
        />
        <DonutChart
          data={origemDonut}
          title="Origem"
          description="Canais que mais geraram leads"
          size="lg"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <MotionReveal index={6} className="lg:col-span-1">
          <Card className="h-full border-border/70 bg-card/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Precisam de atenção</CardTitle>
              <CardDescription>Perfil incompleto e leads no início do pipeline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {attentionLeads.pendingProfile.length === 0 && attentionLeads.pipelineHot.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum lead pendente no momento.</p>
              ) : (
                <>
                  {attentionLeads.pendingProfile.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Perfil incompleto · {row.origem}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(row.dataHora), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  ))}
                  {attentionLeads.pipelineHot.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {LEAD_STATUS_LABELS[lead.status as LeadStatus]} ·{' '}
                          {LEAD_SOURCE_LABELS[lead.source] ?? lead.source}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  ))}
                </>
              )}
              <Button variant="ghost" size="sm" className="mt-1 w-full rounded-xl" asChild>
                <Link to="/leads">
                  Ver todos os leads
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </MotionReveal>

        <MotionReveal index={7} className="lg:col-span-1">
          <Card className="h-full border-border/70 bg-card/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Atalhos</CardTitle>
              <CardDescription>Acesso rápido às áreas do GêLeads</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {SHORTCUTS.map(({ path, label, description, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5',
                    'transition-colors hover:border-primary/30 hover:bg-primary/5',
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">{description}</span>
                  </span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </MotionReveal>

        <MotionReveal index={8} className="lg:col-span-1">
          <Card className="h-full border-border/70 bg-card/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Atividade recente</CardTitle>
              <CardDescription>Últimas movimentações no pipeline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
              ) : (
                recentActivity.map((item) => (
                  <div key={item.id} className="flex gap-3 rounded-xl border border-border/50 px-3 py-2.5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <BookOpen className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.leadName}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground/80">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </MotionReveal>
      </div>
    </div>
  );
}
