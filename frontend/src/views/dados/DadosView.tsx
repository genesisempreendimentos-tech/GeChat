import { useEffect, useMemo, useRef, useState } from 'react';
import { ConversionFunnelChart } from '@/components/dados/DadosCharts';
import { DadosResumoCards } from '@/components/dados/DadosResumoCards';
import { DadosTabsSection } from '@/components/dados/DadosTabsSection';
import { MotionReveal } from '@/components/motion/AppMotion';
import { computeDadosBalanceCtx, type DadosFilters } from '@/lib/dadosFilters';
import {
  aggregateByDay,
  aggregateByPaginaBars,
  aggregateChannelSeriesOverTime,
  aggregateDeviceStack100,
  buildConversionFunnel,
  buildLeadHeatmap,
  buildOperationalFunnelFromStats,
  channelLineColor,
  dadosTimeRangeDays,
  filterRowsInDays,
  filterRowsInPreviousDays,
  type DayMetric,
  type DadosTimeRange,
} from '@/lib/dadosAggregations';
import {
  aggregateCreditoSituacao,
  aggregateEmpreendimentoTable,
  aggregateIdadeEmAberto,
  aggregateOrigemLeadsTable,
  aggregateSafraMaturacao,
  computeTempoMedioAvanco,
  hasMaturacaoDateData,
} from '@/lib/dadosMaturacao';
import { computeLeadsInfoboxStats } from '@/lib/leadsMetrics';
import type { LeadMetricaFiltro } from '@/lib/leadsControlLine';
import { useFilteredLeadRows } from '@/hooks/useFilteredLeadRows';
import { useLeadsData } from '@/hooks/useLeadsData';
import { LeadsLoadingProgress } from '@/components/LeadsLoadingProgress';
import { MaturacaoPreviewResumo } from '@/views/maturacao/MaturacaoView';
import { EmpreendimentoPreviewResumo } from '@/views/empreendimentos/EmpreendimentosView';
import { aggregateEmpreendimentoMetrics } from '@/lib/empreendimentosMetrics';

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
  const [evolucaoMetric, setEvolucaoMetric] = useState<DayMetric>('leads');
  const days = dadosTimeRangeDays(timeRange);
  const rangedRows = useMemo(() => filterRowsInDays(filteredRows, days), [filteredRows, days]);
  const previousRangedRows = useMemo(
    () => filterRowsInPreviousDays(filteredRows, days),
    [filteredRows, days],
  );

  const funnelSteps = useMemo(() => buildConversionFunnel(filteredRows), [filteredRows]);
  const operationalFunnelSteps = useMemo(
    () => buildOperationalFunnelFromStats(infoboxStats),
    [infoboxStats],
  );
  const paginaBars = useMemo(() => aggregateByPaginaBars(filteredRows), [filteredRows]);
  const deviceStack = useMemo(() => aggregateDeviceStack100(filteredRows), [filteredRows]);
  const heatmapCells = useMemo(() => buildLeadHeatmap(filteredRows), [filteredRows]);

  const evolucaoByDay = useMemo(
    () => aggregateByDay(rangedRows, evolucaoMetric, days),
    [rangedRows, evolucaoMetric, days],
  );
  const evolucaoPrevious = useMemo(
    () =>
      evolucaoMetric === 'conversoes'
        ? aggregateByDay(previousRangedRows, evolucaoMetric, days)
        : undefined,
    [previousRangedRows, evolucaoMetric, days],
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

  const origemRows = useMemo(() => aggregateOrigemLeadsTable(filteredRows), [filteredRows]);
  const empreendimentoRows = useMemo(
    () => aggregateEmpreendimentoTable(filteredRows),
    [filteredRows],
  );
  const safraRows = useMemo(() => aggregateSafraMaturacao(filteredRows), [filteredRows]);
  const tempoMedio = useMemo(() => computeTempoMedioAvanco(filteredRows), [filteredRows]);
  const idadeFaixas = useMemo(() => aggregateIdadeEmAberto(filteredRows), [filteredRows]);
  const creditoSituacao = useMemo(() => aggregateCreditoSituacao(filteredRows), [filteredRows]);
  const hasMaturacaoDates = useMemo(() => hasMaturacaoDateData(filteredRows), [filteredRows]);

  const empreendimentoMetrics = useMemo(
    () => aggregateEmpreendimentoMetrics(filteredRows),
    [filteredRows],
  );

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
        filtros.canal,
        filtros.qualificacao,
        filtros.etapaAtual,
        filtros.visao,
      ].join('|'),
    [filtros],
  );

  const chartsRevision = `${filterRevision}|${timeRange}|${evolucaoMetric}`;

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
      <DadosResumoCards
        stats={infoboxStats}
        rows={filteredRows}
        balanceCtx={leadsBalanceCtx}
      />

      <MotionReveal index={8}>
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
          <ConversionFunnelChart
            fillHeight
            className="w-full"
            steps={funnelSteps}
            revision={filterRevision}
            title="Funil de Marketing"
            description="Do lead capturado ao lead qualificado"
          />
          <ConversionFunnelChart
            fillHeight
            className="w-full"
            steps={operationalFunnelSteps}
            revision={filterRevision}
            title="Funil Comercial"
            description="Do atendimento à venda"
          />
        </div>
      </MotionReveal>

      <MotionReveal index={9}>
        <MaturacaoPreviewResumo rows={filteredRows} />
      </MotionReveal>

      <MotionReveal index={10}>
        <EmpreendimentoPreviewResumo metrics={empreendimentoMetrics} />
      </MotionReveal>

      <MotionReveal index={11}>
        <DadosTabsSection
          defaultTab={filtros.visao}
          evolucaoMetric={evolucaoMetric}
          onEvolucaoMetricChange={setEvolucaoMetric}
          evolucaoData={evolucaoByDay}
          evolucaoPrevious={evolucaoPrevious}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          chartsRevision={chartsRevision}
          animateChartEntrance={animateChartEntrance}
          channelSeries={channelSeries}
          channelColors={channelColors}
          origemRows={origemRows}
          empreendimentoRows={empreendimentoRows}
          deviceStack={deviceStack}
          heatmapCells={heatmapCells}
          safraRows={safraRows}
          tempoMedio={tempoMedio}
          idadeFaixas={idadeFaixas}
          creditoSituacao={creditoSituacao}
          hasMaturacaoDates={hasMaturacaoDates}
          paginaBars={paginaBars}
        />
      </MotionReveal>
    </div>
  );
}
