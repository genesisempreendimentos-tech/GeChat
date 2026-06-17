import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LeadsListQuery, LeadsListResponse, LeadsPanelFilters } from '@/types/leadsOverview';
import { fetchLeadsList } from '@/services/leadsOverviewService';

function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export type UseLeadsListResult = {
  data: LeadsListResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useLeadsList(
  filters: LeadsPanelFilters,
  page: number,
  pageSize = 25,
): UseLeadsListResult {
  const [data, setData] = useState<LeadsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const debouncedEmpreendimento = useDebouncedValue(filters.empreendimento);
  const debouncedBusca = useDebouncedValue(filters.busca);

  const query = useMemo(
    (): LeadsListQuery => ({
      ...filters,
      empreendimento: debouncedEmpreendimento,
      busca: debouncedBusca,
      page,
      pageSize,
    }),
    [
      filters.periodo,
      filters.canal,
      filters.fonte,
      filters.situacao_cv,
      debouncedEmpreendimento,
      debouncedBusca,
      page,
      pageSize,
    ],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: payload, error: fetchError } = await fetchLeadsList(query);
    if (fetchError) {
      setError(fetchError);
      setData(null);
    } else {
      setData(payload);
    }
    setLoading(false);
  }, [query]);

  useEffect(() => {
    void load();
  }, [load, fetchKey]);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  return { data, loading, error, refetch };
}
