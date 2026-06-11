import { useCallback, useState } from 'react';
import {
  buildMaturacaoFiltersFromFaixa,
  defaultMaturacaoFilters,
  type MaturacaoFaixaTemporal,
  type MaturacaoFilters,
} from '@/lib/maturacaoFilters';

export function useMaturacaoFilters(initial?: MaturacaoFilters) {
  const [filtrosPanelAberto, setFiltrosPanelAberto] = useState(false);
  const [filtros, setFiltros] = useState<MaturacaoFilters>(initial ?? defaultMaturacaoFilters());
  const [appliedFiltros, setAppliedFiltros] = useState<MaturacaoFilters>(
    initial ?? defaultMaturacaoFilters(),
  );

  const handleApplyFiltros = useCallback(() => {
    setAppliedFiltros(filtros);
  }, [filtros]);

  const handleClearFiltros = useCallback(() => {
    const next = defaultMaturacaoFilters();
    setFiltros(next);
    setAppliedFiltros(next);
  }, []);

  const handleFaixaTemporal = useCallback((faixa: Exclude<MaturacaoFaixaTemporal, 'custom'>) => {
    setFiltros((prev) => {
      const next = buildMaturacaoFiltersFromFaixa(faixa, prev);
      setAppliedFiltros(next);
      return next;
    });
  }, []);

  return {
    filtrosPanelAberto,
    setFiltrosPanelAberto,
    filtros,
    setFiltros,
    appliedFiltros,
    handleApplyFiltros,
    handleClearFiltros,
    handleFaixaTemporal,
  };
}
