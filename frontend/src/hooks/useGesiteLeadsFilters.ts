import { useCallback, useState } from 'react';
import type { GesiteMetricaFiltro } from '@/lib/gesiteControlLine';
import {
  defaultGesiteDadosFilters,
  type GesiteDadosFilters,
} from '@/lib/gesiteDadosFilters';

export function useGesiteLeadsFilters(initial?: GesiteDadosFilters) {
  const [filtrosPanelAberto, setFiltrosPanelAberto] = useState(false);
  const [filtros, setFiltros] = useState<GesiteDadosFilters>(initial ?? defaultGesiteDadosFilters());
  const [appliedFiltros, setAppliedFiltros] = useState<GesiteDadosFilters>(
    initial ?? defaultGesiteDadosFilters(),
  );

  const handleApplyFiltros = useCallback(() => {
    setAppliedFiltros(filtros);
  }, [filtros]);

  const handleClearFiltros = useCallback(() => {
    const next = defaultGesiteDadosFilters();
    setFiltros(next);
    setAppliedFiltros(next);
  }, []);

  const handleMetricaSelect = useCallback((metrica: GesiteMetricaFiltro) => {
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
