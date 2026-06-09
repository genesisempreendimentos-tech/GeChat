import { useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarCheck,
  CreditCard,
  HandCoins,
  Info,
  MessageCircleCheck,
  MessageSquare,
  MonitorSmartphone,
  Users,
} from 'lucide-react';
import { DonutChart, LeadsVolumeChart } from '@/components/Charts';
import { InfoBox } from '@/components/ui/infoboxes';
import { ScoreGaugeChart } from '@/components/charts/ScoreGaugeChart';
import { MotionReveal } from '@/components/motion/AppMotion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { computeGesiteDadosBalanceCtx, type GesiteDadosFilters } from '@/lib/gesiteDadosFilters';
import {
  aggregateGesiteByDay,
  filterGesiteRowsInDays,
  gesiteByDispositivoDonut,
  gesiteByOrigemDonut,
  gesiteByPaginaDonut,
  gesiteByQualificacaoDonut,
  gesiteDadosTimeRangeDays,
  type GesiteDadosTimeRange,
} from '@/lib/gesiteDadosCharts';
import { computeGesiteLeadsInfoboxStats } from '@/lib/gesiteLeadsMetrics';
import type { GesiteMetricaFiltro } from '@/lib/gesiteControlLine';
import { useGesiteFilteredRows } from '@/hooks/useGesiteFilteredRows';
import { GESITE_LEADS_TABLE_MOCK } from '@/views/gesite/GeSiteLeads';
import { cn } from '@/lib/utils';

const PONTUACAO_INFO_TOOLTIP =
  'Pontuação consolidada do GêSite (valores de exemplo). Quando existir API, pode agregar visitas, envolvimento e conversões segundo a vossa fórmula.';

function PontuacaoGaugeCard({ className, value = 72 }: { className?: string; value?: number }) {
  return (
    <MotionReveal
      index={4}
      role="group"
      className={cn(
        'flex min-h-[17rem] min-w-0 flex-col gap-2 overflow-visible rounded-2xl border border-border/70 bg-card/80 px-4 py-4 shadow-sm backdrop-blur-sm dark:bg-card/60 lg:h-full lg:px-5 lg:py-5',
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-medium text-muted-foreground">Pontuação</p>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors',
                'hover:bg-accent hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              )}
              aria-label="Informação: Pontuação"
            >
              <Info className="size-3.5" strokeWidth={2.25} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end" sideOffset={8} collisionPadding={20} className="max-w-xs text-xs">
            {PONTUACAO_INFO_TOOLTIP}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <ScoreGaugeChart value={value} className="w-full max-w-[11rem]" />
      </div>
    </MotionReveal>
  );
}

export type GesiteDadosViewProps = {
  filtros: GesiteDadosFilters;
  onMetricaSelect?: (metrica: GesiteMetricaFiltro) => void;
};

export function GesiteDadosView({ filtros, onMetricaSelect }: GesiteDadosViewProps) {
  void onMetricaSelect;

  const filteredRows = useGesiteFilteredRows(GESITE_LEADS_TABLE_MOCK, filtros);
  const gesiteLeadsBalanceCtx = useMemo(
    () => computeGesiteDadosBalanceCtx(filtros, GESITE_LEADS_TABLE_MOCK),
    [filtros],
  );
  const infoboxStats = useMemo(() => computeGesiteLeadsInfoboxStats(filteredRows), [filteredRows]);

  const [timeRange, setTimeRange] = useState<GesiteDadosTimeRange>('90');
  const days = gesiteDadosTimeRangeDays(timeRange);
  const rangedRows = useMemo(() => filterGesiteRowsInDays(filteredRows, days), [filteredRows, days]);

  const qualificacaoDonut = useMemo(() => gesiteByQualificacaoDonut(filteredRows), [filteredRows]);
  const origemDonut = useMemo(() => gesiteByOrigemDonut(filteredRows), [filteredRows]);
  const dispositivoDonut = useMemo(() => gesiteByDispositivoDonut(filteredRows), [filteredRows]);
  const paginaDonut = useMemo(() => gesiteByPaginaDonut(filteredRows), [filteredRows]);

  const leadsByDay = useMemo(() => aggregateGesiteByDay(rangedRows, 'leads', days), [rangedRows, days]);
  const formsByDay = useMemo(() => aggregateGesiteByDay(rangedRows, 'forms', days), [rangedRows, days]);
  const conversoesByDay = useMemo(
    () => aggregateGesiteByDay(rangedRows, 'conversoes', days),
    [rangedRows, days],
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(13.5rem,1.2fr)] lg:grid-rows-2 lg:items-stretch lg:gap-x-6 lg:gap-y-6">
        <InfoBox
          motionIndex={0}
          title="Leads"
          value={infoboxStats.leads}
          balanceDelta={gesiteLeadsBalanceCtx?.deltas.leads}
          balanceComparison={gesiteLeadsBalanceCtx?.comparison}
          icon={<Users />}
          cor="emerald"
          infoTooltipAlign="start"
          infoTooltip="Total de leads no período filtrado."
        />
        <InfoBox
          motionIndex={1}
          title="Forms"
          value={infoboxStats.forms}
          balanceDelta={gesiteLeadsBalanceCtx?.deltas.forms}
          balanceComparison={gesiteLeadsBalanceCtx?.comparison}
          icon={<BookOpen />}
          cor="blue"
          infoTooltipAlign="start"
          infoTooltip="Leads que chegaram por formulários."
        />
        <InfoBox
          motionIndex={2}
          title="WhatsApp"
          value={infoboxStats.whatsapp}
          balanceDelta={gesiteLeadsBalanceCtx?.deltas.whatsapp}
          balanceComparison={gesiteLeadsBalanceCtx?.comparison}
          icon={<MessageCircleCheck />}
          cor="amber"
          infoTooltipAlign="start"
          infoTooltip="Leads iniciados por clique no WhatsApp."
        />
        <InfoBox
          motionIndex={3}
          title="Taxa de Conversão"
          value={`${infoboxStats.taxaConversaoPct}%`}
          balanceDelta={gesiteLeadsBalanceCtx?.deltas.taxaConversaoPct}
          balanceComparison={gesiteLeadsBalanceCtx?.comparison}
          balanceFormat="percent-points"
          icon={<MonitorSmartphone />}
          cor="violet"
          infoTooltipAlign="end"
          infoTooltip="Conversão total (leads / visitas) no período."
        />
        <PontuacaoGaugeCard
          className={cn(
            'min-h-[17rem] lg:min-h-0 lg:h-full lg:min-w-[13.5rem] lg:self-stretch',
            'lg:col-start-5 lg:row-start-1 lg:row-span-2',
          )}
          value={infoboxStats.pontuacao}
        />
        <InfoBox
          motionIndex={4}
          title="Em atendimento"
          value={infoboxStats.atendimentoCorretor}
          balanceDelta={gesiteLeadsBalanceCtx?.deltas.atendimentoCorretor}
          balanceComparison={gesiteLeadsBalanceCtx?.comparison}
          icon={<MessageSquare />}
          cor="blue"
          infoTooltipAlign="end"
          infoTooltip="Leads em conversa ativa com a equipe de corretores."
        />
        <InfoBox
          motionIndex={5}
          title="Visitas"
          value={infoboxStats.visitasAgendadas}
          balanceDelta={gesiteLeadsBalanceCtx?.deltas.visitasAgendadas}
          balanceComparison={gesiteLeadsBalanceCtx?.comparison}
          icon={<CalendarCheck />}
          cor="violet"
          infoTooltipAlign="start"
          infoTooltip="Leads com visita ao empreendimento já marcada no período."
        />
        <InfoBox
          motionIndex={6}
          title="Análise de Crédito"
          value={infoboxStats.analiseCredito}
          balanceDelta={gesiteLeadsBalanceCtx?.deltas.analiseCredito}
          balanceComparison={gesiteLeadsBalanceCtx?.comparison}
          icon={<CreditCard />}
          cor="muted"
          infoTooltipAlign="end"
          infoTooltip="Leads com perfil completo e preferência por financiamento ou parcelamento."
        />
        <InfoBox
          motionIndex={7}
          title="Vendas"
          value={infoboxStats.vendas}
          balanceDelta={gesiteLeadsBalanceCtx?.deltas.vendas}
          balanceComparison={gesiteLeadsBalanceCtx?.comparison}
          icon={<HandCoins />}
          cor="emerald"
          infoTooltipAlign="end"
          infoTooltip="Leads qualificados como venda fechada no período."
        />
      </div>

      <MotionReveal index={8} className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {qualificacaoDonut.length > 0 ? (
          <DonutChart
            data={qualificacaoDonut}
            title="Qualificação"
            description="Distribuição por nível de qualificação"
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Qualificação</CardTitle>
              <CardDescription>Sem dados no período selecionado</CardDescription>
            </CardHeader>
          </Card>
        )}
        {origemDonut.length > 0 ? (
          <DonutChart
            data={origemDonut}
            title="Origem"
            description="De onde vieram os leads capturados"
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Origem</CardTitle>
              <CardDescription>Sem dados no período selecionado</CardDescription>
            </CardHeader>
          </Card>
        )}
        {dispositivoDonut.length > 0 ? (
          <DonutChart
            data={dispositivoDonut}
            title="Dispositivo"
            description="Desktop, mobile e tablet"
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Dispositivo</CardTitle>
              <CardDescription>Sem dados no período selecionado</CardDescription>
            </CardHeader>
          </Card>
        )}
      </MotionReveal>

      {paginaDonut.length > 0 ? (
        <MotionReveal index={9}>
          <DonutChart
            data={paginaDonut}
            title="Leads por página"
            description="Proxy de empreendimento via página de captura"
          />
        </MotionReveal>
      ) : null}

      <MotionReveal index={10} className="space-y-6">
        <LeadsVolumeChart
          data={leadsByDay}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          title="Leads por dia"
          description="Volume diário de novos leads"
        />
        <LeadsVolumeChart
          data={formsByDay}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          title="Forms por dia"
          description="Contatos com e-mail (formulário)"
        />
        <LeadsVolumeChart
          data={conversoesByDay}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          title="Conversões por dia"
          description="Leads com perfil completo no questionário"
        />
      </MotionReveal>
    </div>
  );
}
