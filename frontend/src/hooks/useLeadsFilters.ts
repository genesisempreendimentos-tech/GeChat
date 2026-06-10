import { useCallback, useState } from 'react';
import type { LeadMetricaFiltro } from '@/lib/leadsControlLine';
import {
  defaultDadosFilters,
  type DadosFilters,
} from '@/lib/dadosFilters';

export function useLeadsFilters(initial?: DadosFilters) {
  const [filtrosPanelAberto, setFiltrosPanelAberto] = useState(false);
  const [filtros, setFiltros] = useState<DadosFilters>(initial ?? defaultDadosFilters());
  const [appliedFiltros, setAppliedFiltros] = useState<DadosFilters>(
    initial ?? defaultDadosFilters(),
  );

  const handleApplyFiltros = useCallback(() => {
    setAppliedFiltros(filtros);
  }, [filtros]);

  const handleClearFiltros = useCallback(() => {
    const next = defaultDadosFilters();
    setFiltros(next);
    setAppliedFiltros(next);
  }, []);

  const handleMetricaSelect = useCallback((metrica: LeadMetricaFiltro) => {
    setFiltros((prev) => ({ ...prev, metrica }));
    setAppliedFiltros((prev) => ({ ...prev, metrica }));
  }, []);

  return {
    filtrosPanelAberto,
    setFiltrosPanelAberto,
    filtros,
    setFiltros,
    appliedFiltros,
    setAppliedFiltros,
    handleApplyFiltros,
    handleClearFiltros,
    handleMetricaSelect,
  };
}
