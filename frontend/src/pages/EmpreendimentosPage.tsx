import { useMemo } from 'react';
import { Building2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { MainViewHeader } from '@/components/layout/header';
import { FiltrosPanelMotion } from '@/components/dados/FiltrosPanelMotion';
import {
  collectEmpreendimentosFilterOptions,
  EmpreendimentosFiltersPanel,
} from '@/components/empreendimentos/EmpreendimentosFiltersPanel';
import { useEmpreendimentosFilters } from '@/hooks/useEmpreendimentosFilters';
import { useLeadsData } from '@/hooks/useLeadsData';
import { EmpreendimentosView } from '@/views/empreendimentos/EmpreendimentosView';

export default function EmpreendimentosPage() {
  const {
    filtrosPanelAberto,
    setFiltrosPanelAberto,
    filtros,
    setFiltros,
    appliedFiltros,
    handleApplyFiltros,
    handleClearFiltros,
    handlePeriodoRapido,
  } = useEmpreendimentosFilters();

  const { rows } = useLeadsData();
  const filterOptions = useMemo(() => collectEmpreendimentosFilterOptions(rows), [rows]);

  return (
    <MainViewFluidShell>
      <MainViewHeader
        icon={<Building2 className="h-6 w-6" />}
        title="Empreendimentos"
        description="Performance, qualidade e avanço comercial por produto"
        button={
          <Button
            type="button"
            variant={filtrosPanelAberto ? 'default' : 'outline'}
            className="rounded-xl gap-2"
            onClick={() => setFiltrosPanelAberto((open) => !open)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
          </Button>
        }
      />
      <div className="mt-8">
        <FiltrosPanelMotion open={filtrosPanelAberto}>
          <EmpreendimentosFiltersPanel
            value={filtros}
            onChange={setFiltros}
            onApply={handleApplyFiltros}
            onClear={handleClearFiltros}
            onPeriodoRapido={handlePeriodoRapido}
            filterOptions={filterOptions}
          />
        </FiltrosPanelMotion>
        <EmpreendimentosView filtros={appliedFiltros} />
      </div>
    </MainViewFluidShell>
  );
}
