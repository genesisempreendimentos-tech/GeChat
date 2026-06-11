import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  ChannelTrendLineChart,
  EvolucaoLeadsChart,
  HorizontalBarRankChart,
  LeadHeatmapChart,
  StackedPercentBarChart,
} from '@/components/dados/DadosCharts';
import { EmpreendimentoTable } from '@/components/dados/EmpreendimentoTable';
import {
  CreditoSituacaoCard,
  IdadeLeadsAbertoCard,
  SafraMaturacaoChart,
  TempoMedioAvancoChart,
} from '@/components/dados/DadosMaturacaoCharts';
import { OrigemLeadsTable } from '@/components/dados/OrigemLeadsTable';
import type { DadosVisao } from '@/lib/dadosFilters';
import type {
  BarRankItem,
  ChannelSeriesPoint,
  DayMetric,
  DeviceStackSegment,
  DadosTimeRange,
  HeatmapCell,
  VolumePoint,
} from '@/lib/dadosAggregations';
import type {
  CreditoSituacao,
  EmpreendimentoDesempenhoRow,
  IdadeFaixaItem,
  OrigemLeadsRow,
  SafraMaturacaoRow,
  TempoMedioItem,
} from '@/lib/dadosMaturacao';
type DadosTabsSectionProps = {
  defaultTab?: DadosVisao;
  evolucaoMetric: DayMetric;
  onEvolucaoMetricChange: (metric: DayMetric) => void;
  evolucaoData: VolumePoint[];
  evolucaoPrevious?: VolumePoint[];
  timeRange: DadosTimeRange;
  onTimeRangeChange: (range: DadosTimeRange) => void;
  chartsRevision: string;
  animateChartEntrance: boolean;
  channelSeries: { data: ChannelSeriesPoint[]; channels: string[] };
  channelColors: Record<string, string>;
  origemRows: OrigemLeadsRow[];
  empreendimentoRows: EmpreendimentoDesempenhoRow[];
  deviceStack: DeviceStackSegment[];
  heatmapCells: HeatmapCell[];
  safraRows: SafraMaturacaoRow[];
  tempoMedio: TempoMedioItem[];
  idadeFaixas: IdadeFaixaItem[];
  creditoSituacao: CreditoSituacao;
  hasMaturacaoDates: boolean;
  paginaBars: BarRankItem[];
};

export function DadosTabsSection({
  defaultTab = 'entrada',
  evolucaoMetric,
  onEvolucaoMetricChange,
  evolucaoData,
  evolucaoPrevious,
  timeRange,
  onTimeRangeChange,
  chartsRevision,
  animateChartEntrance,
  channelSeries,
  channelColors,
  origemRows,
  empreendimentoRows,
  deviceStack,
  heatmapCells,
  safraRows,
  tempoMedio,
  idadeFaixas,
  creditoSituacao,
  hasMaturacaoDates,
  paginaBars,
}: DadosTabsSectionProps) {
  const [tab, setTab] = useState(defaultTab === 'maturacao' ? 'maturacao' : 'entrada');

  useEffect(() => {
    setTab(defaultTab === 'maturacao' ? 'maturacao' : 'entrada');
  }, [defaultTab]);

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="mb-6 h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
        <TabsTrigger value="entrada" className="rounded-lg">
          Entrada
        </TabsTrigger>
        <TabsTrigger value="maturacao" className="rounded-lg">
          Maturação
        </TabsTrigger>
        <TabsTrigger value="empreendimentos" className="rounded-lg">
          Empreendimentos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="entrada" className="mt-0 flex flex-col gap-6">
        <EvolucaoLeadsChart
          data={evolucaoData}
          previousData={evolucaoPrevious}
          metric={evolucaoMetric}
          onMetricChange={onEvolucaoMetricChange}
          timeRange={timeRange}
          onTimeRangeChange={onTimeRangeChange}
          revision={chartsRevision}
          animateEntrance={animateChartEntrance}
        />
        <OrigemLeadsTable rows={origemRows} />
        <ChannelTrendLineChart
          data={channelSeries.data}
          channels={channelSeries.channels}
          channelColors={channelColors}
          timeRange={timeRange}
          onTimeRangeChange={onTimeRangeChange}
          revision={chartsRevision}
          animateEntrance={animateChartEntrance}
          title="Leads por canal ao longo do tempo"
          description="Crescimento ou queda de cada origem no período"
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <StackedPercentBarChart
            segments={deviceStack}
            title="Dispositivos"
            description="Desktop, Mobile e Tablet"
          />
          <LeadHeatmapChart
            cells={heatmapCells}
            title="Horários de maior entrada"
            description="Distribuição dos leads por dia e horário"
          />
        </div>
      </TabsContent>

      <TabsContent value="maturacao" className="mt-0 flex flex-col gap-6">
        <SafraMaturacaoChart rows={safraRows} hasDateData={hasMaturacaoDates} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TempoMedioAvancoChart items={tempoMedio} hasDateData={hasMaturacaoDates} />
          <IdadeLeadsAbertoCard faixas={idadeFaixas} />
        </div>
        <CreditoSituacaoCard situacao={creditoSituacao} />
        <div className="flex justify-end">
          <Button asChild variant="outline" className="rounded-xl gap-2">
            <Link to="/maturacao">
              Ver relatório completo de maturação
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="empreendimentos" className="mt-0 flex flex-col gap-6">
        <EmpreendimentoTable rows={empreendimentoRows} />
        <HorizontalBarRankChart
          data={paginaBars}
          title="Desempenho por empreendimento"
          description="Ranking por volume de leads captados"
        />
        <div className="flex justify-end">
          <Button asChild variant="outline" className="rounded-xl gap-2">
            <Link to="/empreendimentos">
              Ver relatório completo de empreendimentos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
