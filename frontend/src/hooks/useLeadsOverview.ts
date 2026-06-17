import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  LeadsBignumbersData,
  LeadsChartsBlock,
  LeadsOverviewQuery,
  LeadsOverviewResponse,
  LeadsTimelineGrain,
} from '@/types/leadsOverview';
import {
  fetchLeadsOverviewBignumbers,
  fetchLeadsOverviewCharts,
  filtersToLeadsQuery,
  leadsOverviewIsEmpty,
} from '@/services/leadsOverviewService';

function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export type UseLeadsOverviewResult = {
  data: LeadsOverviewResponse | null;
  bignumbers: LeadsBignumbersData | null;
  charts: LeadsChartsBlock | null;
  loading: boolean;
  loadingBignumbers: boolean;
  loadingCharts: boolean;
  error: string | null;
  chartsError: string | null;
  refetch: () => void;
  isEmpty: boolean;
};

type UseLeadsOverviewOptions = {
  timelineGrain?: LeadsTimelineGrain;
  isEmpty?: (data: LeadsOverviewResponse) => boolean;
};

export function useLeadsOverview(
  filters: Omit<LeadsOverviewQuery, 'timeline_grain'>,
  options?: UseLeadsOverviewOptions,
): UseLeadsOverviewResult {
  const [bignumbers, setBignumbers] = useState<LeadsBignumbersData | null>(null);
  const [charts, setCharts] = useState<LeadsChartsBlock | null>(null);
  const [loadingBignumbers, setLoadingBignumbers] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartsError, setChartsError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const debouncedEmpreendimento = useDebouncedValue(filters.empreendimento);
  const timelineGrain = options?.timelineGrain ?? 'cadastros';

  const query = useMemo(
    () =>
      ({
        ...filters,
        empreendimento: debouncedEmpreendimento,
        timeline_grain: timelineGrain,
      }) satisfies LeadsOverviewQuery,
    [
      filters.periodo,
      filters.canal,
      filters.fonte,
      filters.situacao_cv,
      debouncedEmpreendimento,
      timelineGrain,
    ],
  );

  const load = useCallback(async () => {
    setLoadingBignumbers(true);
    setLoadingCharts(true);
    setError(null);
    setChartsError(null);

    const bnPromise = fetchLeadsOverviewBignumbers(query).then(({ data, error: bnError }) => {
      if (bnError) {
        setError(bnError);
        setBignumbers(null);
      } else {
        setBignumbers(data);
      }
      setLoadingBignumbers(false);
    });

    const chartsPromise = fetchLeadsOverviewCharts(query).then(({ data, error: chError }) => {
      if (chError) {
        setChartsError(chError);
        setCharts(null);
      } else {
        setCharts(data);
      }
      setLoadingCharts(false);
    });

    await Promise.all([bnPromise, chartsPromise]);
  }, [query]);

  useEffect(() => {
    void load();
  }, [load, fetchKey]);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  const data = useMemo((): LeadsOverviewResponse | null => {
    if (!bignumbers && !charts) return null;
    return {
      bignumbers: bignumbers ?? {
        leads_totais: { count: 0, percent: 0 },
        leads_unicos: { count: 0, percent: 0 },
        duplicados: { count: 0, percent: 0 },
        converteram_reserva: { count: 0, percent: 0 },
        viraram_venda: { count: 0, percent: 0 },
        sem_fonte_marketing: { count: 0, percent: 0 },
      },
      distribuicao: charts?.distribuicao ?? { por_canal: [], por_fonte: [] },
      timeline: charts?.timeline ?? { series: [], points: [], grain: timelineGrain },
    };
  }, [bignumbers, charts, timelineGrain]);

  const isEmptyPredicate = options?.isEmpty ?? leadsOverviewIsEmpty;
  const loading = loadingBignumbers && loadingCharts;
  const isEmpty =
    !loadingBignumbers && !error && (bignumbers == null ? true : isEmptyPredicate(data!));

  return {
    data,
    bignumbers,
    charts,
    loading,
    loadingBignumbers,
    loadingCharts,
    error,
    chartsError,
    refetch,
    isEmpty,
  };
}

export { filtersToLeadsQuery };
