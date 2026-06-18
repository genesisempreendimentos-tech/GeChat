import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchHistorico } from '@/services/historicoService';
import type { HistoricoFilters, HistoricoListResponse } from '@/types/historico';

const DEFAULT_FILTERS: HistoricoFilters = {
  tipos: [],
  empreendimento: '',
  data_de: '',
  data_ate: '',
  busca: '',
};

function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function useHistorico(pageSize = 50) {
  const [filters, setFilters] = useState<HistoricoFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<HistoricoListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const debouncedBusca = useDebouncedValue(filters.busca);

  const queryFilters = useMemo(
    (): HistoricoFilters => ({ ...filters, busca: debouncedBusca }),
    [filters, debouncedBusca],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: payload, error: fetchError } = await fetchHistorico(queryFilters, page, pageSize);
    if (fetchError) {
      setError(fetchError);
      setData(null);
    } else {
      setData(payload);
    }
    setLoading(false);
  }, [queryFilters, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load, fetchKey]);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  const updateFilters = useCallback((patch: Partial<HistoricoFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }, []);

  const toggleTipo = useCallback((tipo: HistoricoFilters['tipos'][number]) => {
    setFilters((prev) => {
      const has = prev.tipos.includes(tipo);
      return {
        ...prev,
        tipos: has ? prev.tipos.filter((t) => t !== tipo) : [...prev.tipos, tipo],
      };
    });
    setPage(1);
  }, []);

  return {
    filters,
    queryFilters,
    page,
    setPage,
    data,
    loading,
    error,
    refetch,
    updateFilters,
    toggleTipo,
  };
}
