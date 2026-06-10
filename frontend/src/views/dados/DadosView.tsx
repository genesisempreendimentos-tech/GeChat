import { useEffect, useMemo, useRef, useState } from 'react';
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
import { InfoBox } from '@/components/ui/infoboxes';
import { ScoreGaugeChart } from '@/components/charts/ScoreGaugeChart';
import { MotionReveal } from '@/components/motion/AppMotion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CampaignPerformanceTable,
  ChannelTrendLineChart,
  ConversionFunnelChart,
  EnhancedVolumeChart,
  HorizontalBarRankChart,
  LeadHeatmapChart,
  StackedPercentBarChart,
} from '@/components/dados/DadosCharts';
import { computeDadosBalanceCtx, type DadosFilters } from '@/lib/dadosFilters';
import {
  aggregateByDay,
  filterRowsInDays,
  filterRowsInPreviousDays,
  collectOrigemCatalog,
  aggregateByPaginaBars,
  aggregateByQualificacaoBars,
  aggregateCampaignPerformance,
  channelLineColor,
  aggregateChannelSeriesOverTime,
  buildConversionFunnel,
  buildOperationalFunnelFromStats,
  aggregateDeviceStack100,
  dadosTimeRangeDays,
  buildLeadHeatmap,
  type DadosTimeRange,
} from '@/lib/dadosAggregations';
import { computeLeadsInfoboxStats } from '@/lib/leadsMetrics';
import type { LeadMetricaFiltro } from '@/lib/leadsControlLine';
import { useFilteredLeadRows } from '@/hooks/useFilteredLeadRows';
import { useLeadsData } from '@/hooks/useLeadsData';
import { LEADS_METRIC_TOOLTIPS } from '@/lib/leadsMetricTooltips';
import { LeadsLoadingProgress } from '@/components/LeadsLoadingProgress';
import { cn } from '@/lib/utils';

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
            {LEADS_METRIC_TOOLTIPS.pontuacao}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <ScoreGaugeChart value={value} className="w-full max-w-[11rem]" />
      </div>
    </MotionReveal>
  );
}

export type DadosViewProps = {
  filtros: DadosFilters;
  onMetricaSelect?: (metrica: LeadMetricaFiltro) => void;
};

export function DadosView({ filtros, onMetricaSelect }: DadosViewProps) {
  void onMetricaSelect;
  const { rows: allRows, loading, progress, error } = useLeadsData();

  const filteredRows = useFilteredLeadRows(allRows, filtros);
  const leadsBalanceCtx = useMemo(
    () => computeDadosBalanceCtx(filtros, allRows),
    [filtros, allRows],
  );
  const infoboxStats = useMemo(() => computeLeadsInfoboxStats(filteredRows), [filteredRows]);

  const [timeRange, setTimeRange] = useState<DadosTimeRange>('90');
  const days = dadosTimeRangeDays(timeRange);
  const rangedRows = useMemo(() => filterRowsInDays(filteredRows, days), [filteredRows, days]);
  const previousRangedRows = useMemo(
    () => filterRowsInPreviousDays(filteredRows, days),
    [filteredRows, days],
  );

  const origemCatalog = useMemo(() => collectOrigemCatalog(allRows), [allRows]);

  const qualificacaoBars = useMemo(() => aggregateByQualificacaoBars(filteredRows), [filteredRows]);
  const funnelSteps = useMemo(() => buildConversionFunnel(filteredRows), [filteredRows]);
  const operationalFunnelSteps = useMemo(
    () => buildOperationalFunnelFromStats(infoboxStats),
    [infoboxStats],
  );
  const paginaBars = useMemo(() => aggregateByPaginaBars(filteredRows), [filteredRows]);
  const deviceStack = useMemo(() => aggregateDeviceStack100(filteredRows), [filteredRows]);
  const campaignRows = useMemo(() => aggregateCampaignPerformance(filteredRows), [filteredRows]);
  const heatmapCells = useMemo(() => buildLeadHeatmap(filteredRows), [filteredRows]);

  const leadsByDay = useMemo(() => aggregateByDay(rangedRows, 'leads', days), [rangedRows, days]);
  const conversoesByDay = useMemo(
    () => aggregateByDay(rangedRows, 'conversoes', days),
    [rangedRows, days],
  );
  const conversoesPrevious = useMemo(
    () => aggregateByDay(previousRangedRows, 'conversoes', days),
    [previousRangedRows, days],
  );

  const channelSeries = useMemo(
    () => aggregateChannelSeriesOverTime(rangedRows, days),
    [rangedRows, days],
  );

  const channelColors = useMemo(() => {
    const map: Record<string, string> = {};
    channelSeries.channels.forEach((ch, i) => {
      map[ch] = channelLineColor(ch, i);
    });
    return map;
  }, [channelSeries.channels]);

  const filterRevision = useMemo(
    () =>
      [
        filtros.balanco,
        filtros.metrica,
        filtros.dataInicial,
        filtros.dataFinal,
        filtros.empreendimento,
        filtros.origem,
        filtros.dispositivo,
      ].join('|'),
    [filtros],
  );

  const chartsRevision = `${filterRevision}|${timeRange}`;

  const mountCountRef = useRef(0);
  const prevTimeRangeRef = useRef(timeRange);
  const animateChartEntrance =
    mountCountRef.current > 0 && prevTimeRangeRef.current !== timeRange;

  useEffect(() => {
    mountCountRef.current += 1;
    prevTimeRangeRef.current = timeRange;
  }, [timeRange, filterRevision]);

  if (loading) {
    return <LeadsLoadingProgress progress={progress} />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Linha 1 — KPIs existentes (preservados) */}
      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(13.5rem,1.2fr)] lg:grid-rows-2 lg:items-stretch lg:gap-x-6 lg:gap-y-6">
        <InfoBox
          motionIndex={0}
          title="Leads"
          value={infoboxStats.leads}
          balanceDelta={leadsBalanceCtx?.deltas.leads}
          balanceComparison={leadsBalanceCtx?.comparison}
          icon={<Users />}
          cor="emerald"
          infoTooltipAlign="start"
          infoTooltip={LEADS_METRIC_TOOLTIPS.leads}
        />
        <InfoBox
          motionIndex={1}
          title="Forms"
          value={infoboxStats.forms}
          balanceDelta={leadsBalanceCtx?.deltas.forms}
          balanceComparison={leadsBalanceCtx?.comparison}
          icon={<BookOpen />}
          cor="blue"
          infoTooltipAlign="start"
          infoTooltip={LEADS_METRIC_TOOLTIPS.forms}
        />
        <InfoBox
          motionIndex={2}
          title="WhatsApp"
          value={infoboxStats.whatsapp}
          balanceDelta={leadsBalanceCtx?.deltas.whatsapp}
          balanceComparison={leadsBalanceCtx?.comparison}
          icon={<MessageCircleCheck />}
          cor="amber"
          infoTooltipAlign="start"
          infoTooltip={LEADS_METRIC_TOOLTIPS.whatsapp}
        />
        <InfoBox
          motionIndex={3}
          title="Taxa de Conversão"
          value={`${infoboxStats.taxaConversaoPct}%`}
          balanceDelta={leadsBalanceCtx?.deltas.taxaConversaoPct}
          balanceComparison={leadsBalanceCtx?.comparison}
          balanceFormat="percent-points"
          icon={<MonitorSmartphone />}
          cor="violet"
          infoTooltipAlign="end"
          infoTooltip={LEADS_METRIC_TOOLTIPS.taxaConversao}
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
          balanceDelta={leadsBalanceCtx?.deltas.atendimentoCorretor}
          balanceComparison={leadsBalanceCtx?.comparison}
          icon={<MessageSquare />}
          cor="blue"
          infoTooltipAlign="end"
          infoTooltip={LEADS_METRIC_TOOLTIPS.atendimentoCorretor}
        />
        <InfoBox
          motionIndex={5}
          title="Visitas"
          value={infoboxStats.visitasAgendadas}
          balanceDelta={leadsBalanceCtx?.deltas.visitasAgendadas}
          balanceComparison={leadsBalanceCtx?.comparison}
          icon={<CalendarCheck />}
          cor="violet"
          infoTooltipAlign="start"
          infoTooltip={LEADS_METRIC_TOOLTIPS.visitasAgendadas}
        />
        <InfoBox
          motionIndex={6}
          title="Análise de Crédito"
          value={infoboxStats.analiseCredito}
          balanceDelta={leadsBalanceCtx?.deltas.analiseCredito}
          balanceComparison={leadsBalanceCtx?.comparison}
          icon={<CreditCard />}
          cor="muted"
          infoTooltipAlign="end"
          infoTooltip={LEADS_METRIC_TOOLTIPS.analiseCredito}
        />
        <InfoBox
          motionIndex={7}
          title="Vendas"
          value={infoboxStats.vendas}
          balanceDelta={leadsBalanceCtx?.deltas.vendas}
          balanceComparison={leadsBalanceCtx?.comparison}
          icon={<HandCoins />}
          cor="emerald"
          infoTooltipAlign="end"
          infoTooltip={LEADS_METRIC_TOOLTIPS.vendas}
        />
      </div>

      {/* Gráficos — layout bento (12 colunas, cards agrupados por tamanho) */}
      <MotionReveal index={8}>
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
          <div className="w-full lg:col-span-6">
            <ConversionFunnelChart
              fillHeight
              className="w-full"
              steps={funnelSteps}
              revision={filterRevision}
              title="Funil de Marketing"
              description="Fluxo do visitante até a conversão — percentual entre etapas"
            />
          </div>
          <div className="w-full lg:col-span-6">
            <ConversionFunnelChart
              fillHeight
              className="w-full"
              steps={operationalFunnelSteps}
              revision={filterRevision}
              title="Funil Comercial"
              description="Em atendimento, visitas e vendas — aguardando dados do CVCRM via webhook"
            />
          </div>

          <div className="lg:col-span-6">
            <EnhancedVolumeChart
              data={leadsByDay}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              revision={chartsRevision}
              animateEntrance={animateChartEntrance}
              title="Leads por dia"
              description="Volume diário de novos leads"
              valueLabel="Leads"
            />
          </div>
          <div className="lg:col-span-6">
            <EnhancedVolumeChart
              data={conversoesByDay}
              previousData={conversoesPrevious}
              showTrendLine
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              revision={chartsRevision}
              animateEntrance={animateChartEntrance}
              title="Conversões por dia"
              description="Linha tracejada = período anterior"
              valueLabel="Conversões"
            />
          </div>

          {/* Coluna compacta: qualificação + dispositivos + heatmap */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            <HorizontalBarRankChart
              data={qualificacaoBars}
              title="Qualificação dos leads"
              description="Distribuição por nível"
            />
            <StackedPercentBarChart
              segments={deviceStack}
              title="Dispositivos"
              description="Desktop, Mobile e Tablet"
            />
            <LeadHeatmapChart
              cells={heatmapCells}
              title="Heatmap de horários"
              description="Dia da semana × horário"
            />
          </div>

          {/* Coluna ampla: páginas + campanhas + evolução por canal */}
          <div className="flex flex-col gap-6 lg:col-span-8">
            <HorizontalBarRankChart
              data={paginaBars}
              title="Leads por página"
              description="Ranking das páginas que mais convertem"
            />
            <CampaignPerformanceTable
              rows={campaignRows}
              title="Performance das campanhas"
              description="Métricas por origem — ordenado por conversões"
            />
            <ChannelTrendLineChart
              data={channelSeries.data}
              channels={channelSeries.channels}
              channelColors={channelColors}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              revision={chartsRevision}
              animateEntrance={animateChartEntrance}
              title="Leads por canal ao longo do tempo"
              description="Crescimento ou queda de cada origem no período"
            />
          </div>
        </div>
      </MotionReveal>
    </div>
  );
}
