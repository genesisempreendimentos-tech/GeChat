import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { MainViewHeader } from '@/components/layout/header';
import { HistoricoFiltersBar } from '@/components/historico/HistoricoFiltersBar';
import { HistoricoFeedTable } from '@/components/historico/HistoricoFeedTable';
import { NotificacoesBell } from '@/components/historico/NotificacoesBell';
import { useHistorico } from '@/hooks/useHistorico';
import { fetchUserEmpreendimentos } from '@/services/empreendimentosService';

export default function UserHistoricoPage() {
  const {
    filters,
    page,
    setPage,
    data,
    loading,
    error,
    refetch,
    updateFilters,
    toggleTipo,
  } = useHistorico(50);

  const [empreendimentos, setEmpreendimentos] = useState<{ id: number; nome: string }[]>([]);

  useEffect(() => {
    void fetchUserEmpreendimentos().then(({ data: payload }) => {
      setEmpreendimentos(
        (payload?.empreendimentos ?? []).map((e) => ({ id: e.id, nome: e.nome })),
      );
    });
  }, []);

  return (
    <MainViewFluidShell>
      <MainViewHeader
        icon={<History className="h-6 w-6" />}
        title="Histórico"
        description="Feed de movimentações de leads e reservas — projetado do CVCRM."
        button={<NotificacoesBell />}
      />

      <div className="mt-8 flex flex-col gap-6">
        <HistoricoFiltersBar
          filters={filters}
          empreendimentos={empreendimentos}
          onToggleTipo={toggleTipo}
          onChange={updateFilters}
        />

        <HistoricoFeedTable
          rows={data?.rows ?? []}
          total={data?.total ?? 0}
          page={data?.page ?? page}
          pages={data?.pages ?? 1}
          loading={loading}
          error={error}
          onPageChange={setPage}
          onRetry={refetch}
        />
      </div>
    </MainViewFluidShell>
  );
}
