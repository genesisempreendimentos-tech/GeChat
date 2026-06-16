import { useCallback, useEffect, useMemo, useState } from 'react';
import { subDays, startOfYear, format } from 'date-fns';
import type { VendasCompetenciaResponse, VendasFilters } from '@/types/vendas';
import { fetchVendasCompetencia, type VendasQueryParams } from '@/services/vendasService';

function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export type UseVendasResult = {
  data: VendasCompetenciaResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isEmpty: boolean;
};

function resolvePeriodDates(periodo: VendasFilters['periodo']): Pick<VendasQueryParams, 'data_venda_de' | 'data_venda_ate'> {
  if (periodo === 'todos') return {};
  const today = new Date();
  const ate = format(today, 'yyyy-MM-dd');
  if (periodo === '30d') {
    return { data_venda_de: format(subDays(today, 30), 'yyyy-MM-dd'), data_venda_ate: ate };
  }
  if (periodo === '90d') {
    return { data_venda_de: format(subDays(today, 90), 'yyyy-MM-dd'), data_venda_ate: ate };
  }
  if (periodo === '12m') {
    return { data_venda_de: format(subDays(today, 365), 'yyyy-MM-dd'), data_venda_ate: ate };
  }
  if (periodo === 'ytd') {
    return { data_venda_de: format(startOfYear(today), 'yyyy-MM-dd'), data_venda_ate: ate };
  }
  return {};
}

export function filtersToQuery(filters: VendasFilters): VendasQueryParams {
  return {
    ...resolvePeriodDates(filters.periodo),
    empreendimento: filters.empreendimento || undefined,
    imobiliaria: filters.imobiliaria || undefined,
  };
}

type UseVendasOptions = {
  /** Permite injetar mock na Vitrine sem alterar os componentes. */
  fetcher?: (params: VendasQueryParams) => ReturnType<typeof fetchVendasCompetencia>;
};

export function useVendas(filters: VendasFilters, options?: UseVendasOptions): UseVendasResult {
  const [data, setData] = useState<VendasCompetenciaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const debouncedEmpreendimento = useDebouncedValue(filters.empreendimento);
  const debouncedImobiliaria = useDebouncedValue(filters.imobiliaria);

  const query = useMemo(
    () =>
      filtersToQuery({
        ...filters,
        empreendimento: debouncedEmpreendimento,
        imobiliaria: debouncedImobiliaria,
      }),
    [filters.periodo, debouncedEmpreendimento, debouncedImobiliaria],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const fetcher = options?.fetcher ?? fetchVendasCompetencia;
    const { data: payload, error: fetchError } = await fetcher(query);
    if (fetchError) {
      setError(fetchError);
      setData(null);
    } else {
      setData(payload);
    }
    setLoading(false);
  }, [query, options?.fetcher]);

  useEffect(() => {
    void load();
  }, [load, fetchKey]);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  const isEmpty = !loading && !error && (data?.totais.vendas_efetuadas ?? 0) === 0;

  return { data, loading, error, refetch, isEmpty };
}
