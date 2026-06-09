import { useMemo } from 'react';
import { BarChart3, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { MainViewHeader } from '@/components/layout/header';
import {
  GesiteDadosFiltersPanel,
  collectGesiteDadosFilterOptions,
} from '@/components/gesite/GesiteDadosFiltersPanel';
import { GesiteFiltrosPanelMotion } from '@/components/gesite/GesiteFiltrosPanelMotion';
import { useGesiteLeadsFilters } from '@/hooks/useGesiteLeadsFilters';
import { GesiteDadosView } from '@/views/gesite/GesiteDadosView';
import { GESITE_LEADS_TABLE_MOCK } from '@/views/gesite/GeSiteLeads';

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
  } = useGesiteLeadsFilters();

  const filterOptions = useMemo(
    () => collectGesiteDadosFilterOptions(GESITE_LEADS_TABLE_MOCK),
    [],
  );

  return (
    <MainViewFluidShell>
      <MainViewHeader
        icon={<BarChart3 className="h-6 w-6" />}
        title="Dados"
        description="Analytics do GêSite — métricas, distribuição e evolução temporal dos leads"
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
        <GesiteFiltrosPanelMotion open={filtrosPanelAberto}>
          <GesiteDadosFiltersPanel
            value={filtros}
            onChange={setFiltros}
            onApply={handleApplyFiltros}
            onClear={handleClearFiltros}
            onMetricaSelect={handleMetricaSelect}
            filterOptions={filterOptions}
          />
        </GesiteFiltrosPanelMotion>
        <GesiteDadosView filtros={appliedFiltros} onMetricaSelect={handleMetricaSelect} />
      </div>
    </MainViewFluidShell>
  );
}
