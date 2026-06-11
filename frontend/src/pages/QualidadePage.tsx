import { useMemo } from 'react';
import { Award, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { MainViewHeader } from '@/components/layout/header';
import {
  DadosFiltersPanel,
  collectDadosFilterOptions,
} from '@/components/dados/DadosFiltersPanel';
import { FiltrosPanelMotion } from '@/components/dados/FiltrosPanelMotion';
import { useLeadsFilters } from '@/hooks/useLeadsFilters';
import { useLeadsData } from '@/hooks/useLeadsData';
import { QualidadeView } from '@/views/qualidade/QualidadeView';

export default function QualidadePage() {
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

  const { rows } = useLeadsData();
  const filterOptions = useMemo(() => collectDadosFilterOptions(rows), [rows]);

  return (
    <MainViewFluidShell>
      <MainViewHeader
        icon={<Award className="h-6 w-6" />}
        title="Qualidade"
        description="Entenda a qualificação dos leads por origem, empreendimento e nível de perfil"
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
        <QualidadeView filtros={appliedFiltros} />
      </div>
    </MainViewFluidShell>
  );
}
