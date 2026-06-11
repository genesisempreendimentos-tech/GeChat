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
  QualidadeBreakdownRow,
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
  qualificacaoBars: BarRankItem[];
  qualidadeAlertPct: number | null;
  qualidadePorOrigem: QualidadeBreakdownRow[];
  qualidadePorEmpreendimento: QualidadeBreakdownRow[];
  deviceStack: DeviceStackSegment[];
  heatmapCells: HeatmapCell[];
  safraRows: SafraMaturacaoRow[];
  tempoMedio: TempoMedioItem[];
  idadeFaixas: IdadeFaixaItem[];
  creditoSituacao: CreditoSituacao;
  hasMaturacaoDates: boolean;
  paginaBars: BarRankItem[];
};

function QualidadeAlert({ pct }: { pct: number }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
      {pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% dos leads estão sem qualificação.
      Isso reduz a precisão da análise de qualidade.
    </div>
  );
}

function QualidadeBreakdownTable({ rows, title }: { rows: QualidadeBreakdownRow[]; title: string }) {
  if (!rows.length) return null;
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-4">
      <p className="mb-3 text-sm font-medium text-foreground">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[24rem] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">Grupo</th>
              <th className="pb-2 pr-3 text-right font-medium">Alta</th>
              <th className="pb-2 pr-3 text-right font-medium">Média</th>
              <th className="pb-2 pr-3 text-right font-medium">Baixa</th>
              <th className="pb-2 text-right font-medium">Indefinida</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 8).map((row) => (
              <tr key={row.grupo} className="border-b border-border/40 last:border-0">
                <td className="py-2 pr-3 font-medium">{row.grupo}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{row.alta}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{row.media}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{row.baixa}</td>
                <td className="py-2 text-right tabular-nums">{row.indefinida}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
  qualificacaoBars,
  qualidadeAlertPct,
  qualidadePorOrigem,
  qualidadePorEmpreendimento,
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
        <TabsTrigger value="qualidade" className="rounded-lg">
          Qualidade
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

      <TabsContent value="qualidade" className="mt-0 flex flex-col gap-6">
        {qualidadeAlertPct !== null && qualidadeAlertPct > 50 ? (
          <QualidadeAlert pct={qualidadeAlertPct} />
        ) : null}
        <HorizontalBarRankChart
          data={qualificacaoBars}
          title="Qualidade dos leads"
          description="Distribuição por nível de qualificação"
        />
        <QualidadeBreakdownTable rows={qualidadePorOrigem} title="Qualidade por origem" />
        <QualidadeBreakdownTable
          rows={qualidadePorEmpreendimento}
          title="Qualidade por empreendimento"
        />
      </TabsContent>
    </Tabs>
  );
}
