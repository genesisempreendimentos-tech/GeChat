import { useState } from 'react';
import { Users, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { MainViewHeader } from '@/components/layout/header';
import { GeSiteLeads } from '@/views/gesite/GeSiteLeads';
import {
  defaultGesitePageControlFilters,
  type GesitePageControlFilters,
} from '@/lib/gesiteControlLine';

export default function LeadsPage() {
  const [filtrosPanelAberto, setFiltrosPanelAberto] = useState(false);
  const [filtros, setFiltros] = useState<GesitePageControlFilters>(defaultGesitePageControlFilters());
  const [appliedFiltros, setAppliedFiltros] = useState<GesitePageControlFilters>(
    defaultGesitePageControlFilters(),
  );

  function handleClearFiltros() {
    const next = defaultGesitePageControlFilters();
    setFiltros(next);
    setAppliedFiltros(next);
  }

  return (
    <MainViewFluidShell>
      <MainViewHeader
        icon={<Users className="h-6 w-6" />}
        title="Leads"
        description="Leads capturados pelo GêSite — páginas, fontes e perfil de qualificação"
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
        <GeSiteLeads
          filtrosPanelAberto={filtrosPanelAberto}
          filtros={appliedFiltros}
          onFiltrosChange={setFiltros}
          onApplyFiltros={() => setAppliedFiltros(filtros)}
          onClearFiltros={handleClearFiltros}
        />
      </div>
    </MainViewFluidShell>
  );
}
