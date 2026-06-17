import { useCallback, useMemo, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Skeleton } from '@/components/ui/skeleton';

import { VisitorsSitesLineChart } from '@/components/charts/VisitorsSitesLineChart';

import { LeadsTimelineChartHeaderActions } from '@/components/charts/LeadsTimelineChartHeaderActions';

import {

  resolveLeadsTimelineSlice,

  type LeadsTimelineViewMode,

} from '@/lib/leadsTimelineChart';

import type {

  LeadsOverviewResponse,

  LeadsPanelFilters,

  LeadsTimelineGrain,

} from '@/types/leadsOverview';



type LeadsTimelineChartProps = {

  timeline: LeadsOverviewResponse['timeline'] | null;

  grain: LeadsTimelineGrain;

  onGrainChange: (grain: LeadsTimelineGrain) => void;

  periodo?: LeadsPanelFilters['periodo'];

  loading?: boolean;

};



export function LeadsTimelineChart({

  timeline,

  grain,

  onGrainChange,

  periodo = 'todos',

  loading,

}: LeadsTimelineChartProps) {

  const [viewMode, setViewMode] = useState<LeadsTimelineViewMode>('compacto');

  const [stacked, setStacked] = useState(false);

  const [merged, setMerged] = useState(false);

  const [averageEnabled, setAverageEnabled] = useState(false);

  const [allSeriesSelected, setAllSeriesSelected] = useState(true);



  const timelineSlice = useMemo(

    () =>

      resolveLeadsTimelineSlice(timeline, viewMode, stacked, {

        periodo,

      }),

    [timeline, viewMode, stacked, periodo],

  );



  const handleVisibleSeriesChange = useCallback((_keys: string[]) => {

    // Reservado para export CSV futuro.

  }, []);



  const grainLabel = grain === 'pessoas' ? 'pessoas únicas' : 'cadastros';



  return (

    <Card>

      <CardHeader className="flex flex-col gap-3 space-y-0 pb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">

        <div className="min-w-0">

          <CardTitle className="text-base">Linha do tempo</CardTitle>

          <CardDescription>

            Volume de{' '}

            <span className="font-semibold text-teal-500">{grainLabel}</span> por empreendimento de

            interesse ao longo do período.

          </CardDescription>

        </div>

        <LeadsTimelineChartHeaderActions

          grain={grain}

          onGrainChange={onGrainChange}

          viewMode={viewMode}

          onViewModeChange={setViewMode}

          isStacked={stacked}

          onStackedChange={setStacked}

          isMerged={merged}

          onMergedChange={setMerged}

          isAverageEnabled={averageEnabled}

          onAverageEnabledChange={setAverageEnabled}

          allSeriesSelected={allSeriesSelected}

          onAllSeriesSelectedChange={setAllSeriesSelected}

        />

      </CardHeader>

      <CardContent>

        {loading ? (

          <Skeleton className="h-[300px] w-full rounded-xl" />

        ) : !timelineSlice.data.length ? (

          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">

            Sem dados no período selecionado.

          </div>

        ) : (

          <VisitorsSitesLineChart

            data={timelineSlice.data}

            xKey={timelineSlice.xKey}

            series={timelineSlice.series}

            formatTooltipLabel={timelineSlice.formatTooltipLabel}

            yTickFormatter={timelineSlice.yTickFormatter}

            tooltipValueFormatter={timelineSlice.tooltipValueFormatter}

            mergeAsGesite={merged}

            mergeLineName="Leads"

            showAverageLine={averageEnabled}

            averageLineName="Média"

            allPagesSelected={allSeriesSelected}

            onVisibleSeriesChange={handleVisibleSeriesChange}

          />

        )}

      </CardContent>

    </Card>

  );

}

