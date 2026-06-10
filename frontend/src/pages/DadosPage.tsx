import { useMemo } from 'react';
import { BarChart3, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { MainViewHeader } from '@/components/layout/header';
import {
  DadosFiltersPanel,
  collectDadosFilterOptions,
} from '@/components/dados/DadosFiltersPanel';
import { FiltrosPanelMotion } from '@/components/dados/FiltrosPanelMotion';
import { useLeadsFilters } from '@/hooks/useLeadsFilters';
import { DadosView } from '@/views/dados/DadosView';
import { LEADS_TABLE_MOCK } from '@/views/leads/LeadsView';

export default function DadosPage() {
  const {
    filtrosPanelAberto,
    setFiltrosPanelAberto,
    filtros,
    setFiltros,
    appliedFiltros,
    handleApplyFiltros,
    handleClearFiltros,
    handleMetricaSelect,
  } = useLeadsFilters();

  const filterOptions = useMemo(
    () => collectDadosFilterOptions(LEADS_TABLE_MOCK),
    [],
  );

  return (
    <MainViewFluidShell>
      <MainViewHeader
        icon={<BarChart3 className="h-6 w-6" />}
        title="Dados"
        description="Métricas, distribuição e evolução dos leads no período"
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
          <DadosFiltersPanel
            value={filtros}
            onChange={setFiltros}
            onApply={handleApplyFiltros}
            onClear={handleClearFiltros}
            onMetricaSelect={handleMetricaSelect}
            filterOptions={filterOptions}
          />
        </FiltrosPanelMotion>
        <DadosView filtros={appliedFiltros} onMetricaSelect={handleMetricaSelect} />
      </div>
    </MainViewFluidShell>
  );
}
