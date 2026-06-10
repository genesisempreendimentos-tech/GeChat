import { useMemo } from 'react';
import { applyDadosPipeline, type DadosFilters } from '@/lib/dadosFilters';
import type { LeadMetricsRow } from '@/lib/leadsMetrics';

export function useFilteredLeadRows<T extends LeadMetricsRow>(
  rows: T[],
  filtros: DadosFilters,
): T[] {
  return useMemo(() => applyDadosPipeline(rows, filtros), [rows, filtros]);
}
