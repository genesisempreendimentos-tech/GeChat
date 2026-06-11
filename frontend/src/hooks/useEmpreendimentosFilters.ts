import { useCallback, useState } from 'react';
import {
  defaultEmpreendimentosFilters,
  periodoRapidoToRange,
  type EmpreendimentosFilters,
  type EmpreendimentosPeriodoRapido,
} from '@/lib/empreendimentosFilters';

export function useEmpreendimentosFilters(initial?: EmpreendimentosFilters) {
  const [filtrosPanelAberto, setFiltrosPanelAberto] = useState(false);
  const [filtros, setFiltros] = useState<EmpreendimentosFilters>(
    initial ?? defaultEmpreendimentosFilters(),
  );
  const [appliedFiltros, setAppliedFiltros] = useState<EmpreendimentosFilters>(
    initial ?? defaultEmpreendimentosFilters(),
  );

  const handleApplyFiltros = useCallback(() => {
    setAppliedFiltros(filtros);
  }, [filtros]);

  const handleClearFiltros = useCallback(() => {
    const next = defaultEmpreendimentosFilters();
    setFiltros(next);
    setAppliedFiltros(next);
  }, []);

  const handlePeriodoRapido = useCallback((rapido: EmpreendimentosPeriodoRapido) => {
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
