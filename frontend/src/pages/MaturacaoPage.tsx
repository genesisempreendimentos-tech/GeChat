import { useMemo } from 'react';
import { Hourglass, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { MainViewHeader } from '@/components/layout/header';
import { FiltrosPanelMotion } from '@/components/dados/FiltrosPanelMotion';
import {
  collectMaturacaoFilterOptions,
  MaturacaoFiltersPanel,
} from '@/components/maturacao/MaturacaoFiltersPanel';
import { useMaturacaoFilters } from '@/hooks/useMaturacaoFilters';
import { useLeadsData } from '@/hooks/useLeadsData';
import { MaturacaoView } from '@/views/maturacao/MaturacaoView';

export default function MaturacaoPage() {
  const {
    filtrosPanelAberto,
    setFiltrosPanelAberto,
    filtros,
    setFiltros,
    appliedFiltros,
    handleApplyFiltros,
    handleClearFiltros,
    handlePeriodoRapido,
  } = useMaturacaoFilters();

  const { rows } = useLeadsData();
  const filterOptions = useMemo(() => collectMaturacaoFilterOptions(rows), [rows]);

  return (
    <MainViewFluidShell>
      <MainViewHeader
        icon={<Hourglass className="h-6 w-6" />}
        title="Maturação de Leads"
        description="Acompanhe a evolução dos leads após a captação até as etapas comerciais."
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
          <MaturacaoFiltersPanel
            value={filtros}
            onChange={setFiltros}
            onApply={handleApplyFiltros}
            onClear={handleClearFiltros}
            onPeriodoRapido={handlePeriodoRapido}
            filterOptions={filterOptions}
          />
        </FiltrosPanelMotion>
        <MaturacaoView filtros={appliedFiltros} />
      </div>
    </MainViewFluidShell>
  );
}
