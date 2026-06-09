import { useMemo } from 'react';
import { applyGesiteDadosPipeline, type GesiteDadosFilters } from '@/lib/gesiteDadosFilters';
import type { GesiteLeadMetricsRow } from '@/lib/gesiteLeadsMetrics';

export function useGesiteFilteredRows<T extends GesiteLeadMetricsRow>(
  rows: T[],
  filtros: GesiteDadosFilters,
): T[] {
  return useMemo(() => applyGesiteDadosPipeline(rows, filtros), [rows, filtros]);
}
