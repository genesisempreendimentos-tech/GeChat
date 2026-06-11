import { useCallback, useState } from 'react';
import {
  defaultMaturacaoFilters,
  periodoRapidoToRange,
  type MaturacaoFilters,
  type MaturacaoPeriodoRapido,
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

  const handlePeriodoRapido = useCallback((rapido: MaturacaoPeriodoRapido) => {
    setFiltros((prev) => {
      if (rapido === 'custom') {
        return { ...prev, periodoRapido: rapido };
      }
      const range = periodoRapidoToRange(rapido);
      return {
        ...prev,
        periodoRapido: rapido,
        dataInicial: range.from,
        dataFinal: range.to,
      };
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
    handlePeriodoRapido,
  };
}
