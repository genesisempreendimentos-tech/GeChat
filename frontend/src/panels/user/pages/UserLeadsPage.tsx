import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { MainViewHeader } from '@/components/layout/header';
import { AsyncSection } from '@/components/common/AsyncSection';
import { PageEmptyState, PageErrorState } from '@/components/common/PageStates';
import { LeadsBigNumbers } from '@/components/leads/panel/LeadsBigNumbers';
import { LeadsControlLine } from '@/components/leads/panel/LeadsControlLine';
import { LeadsTimelineChart } from '@/components/leads/panel/LeadsTimelineChart';
import { LeadsDistribuicaoSection } from '@/components/leads/panel/LeadsDistribuicaoSection';
import { LeadsPeopleTable } from '@/components/leads/panel/LeadsPeopleTable';
import { VendasSankeyChart } from '@/components/vendas/VendasSankeyChart';
import { useLeadsOverview } from '@/hooks/useLeadsOverview';
import { useLeadsList } from '@/hooks/useLeadsList';
import { useVendas } from '@/hooks/useVendas';
import type { LeadsPanelFilters } from '@/types/leadsOverview';
import type { VendasFilters } from '@/types/vendas';
import { MotionReveal } from '@/components/motion/AppMotion';

const DEFAULT_FILTERS: LeadsPanelFilters = {
  periodo: 'todos',
  canal: '',
  fonte: 'todos',
  empreendimento: '',
  situacao_cv: '',
  busca: '',
};

const VENDAS_SANKEY_FILTERS: VendasFilters = {
  periodo: 'todos',
  empreendimento: '',
  imobiliaria: '',
};

const LIST_PAGE_SIZE = 25;

export default function UserLeadsPage() {
  const [filters, setFilters] = useState<LeadsPanelFilters>(DEFAULT_FILTERS);
  const [listPage, setListPage] = useState(1);

  const {
    bignumbers,
    charts,
    loadingBignumbers,
    loadingCharts,
    error,
    chartsError,
    refetch,
    isEmpty,
  } = useLeadsOverview(filters);

  const {
    data: listData,
    loading: listLoading,
    error: listError,
    refetch: refetchList,
  } = useLeadsList(filters, listPage, LIST_PAGE_SIZE);

  const { data: vendasSankeyData, loading: vendasSankeyLoading } = useVendas(VENDAS_SANKEY_FILTERS);

  useEffect(() => {
    setListPage(1);
  }, [
    filters.periodo,
    filters.created_de,
    filters.created_ate,
    filters.canal,
    filters.fonte,
    filters.empreendimento,
    filters.situacao_cv,
    filters.busca,
  ]);

  const showCharts = !chartsError && !isEmpty;

  return (
    <MainViewFluidShell>
      <MainViewHeader
        icon={<Users className="h-6 w-6" />}
        title="Leads"
        description="Diagnóstico da carteira com cadastros e pessoas únicas."
      />

      <LeadsControlLine filters={filters} onFiltersChange={setFilters} />

      <div className="mt-8 flex flex-col gap-8">
        <AsyncSection
          error={error}
          onRetry={refetch}
          loading={false}
          isEmpty={false}
          errorState={
            error ? (
              <PageErrorState
                title="Não conseguimos carregar os leads"
                message={error}
                onRetry={refetch}
              />
            ) : undefined
          }
        >
          {null}
        </AsyncSection>

        {!error && isEmpty && !loadingBignumbers ? (
          <PageEmptyState
            title="Sem leads no período"
            description="Não há cadastros para exibir com os filtros atuais."
          />
        ) : (
          <LeadsBigNumbers bignumbers={bignumbers} loading={loadingBignumbers} />
        )}

        {chartsError ? (
          <PageErrorState
            title="Não conseguimos carregar os gráficos"
            message={chartsError}
            onRetry={refetch}
          />
        ) : null}

        {(showCharts || loadingCharts) && !error ? (
          <>
            <MotionReveal index={1}>
              <LeadsTimelineChart
                timeline={charts?.timeline ?? null}
                periodo={filters.periodo}
                dayRange={
                  filters.created_de && filters.created_ate
                    ? { first: filters.created_de, last: filters.created_ate }
                    : undefined
                }
                loading={loadingCharts}
              />
            </MotionReveal>

            <MotionReveal index={2}>
              <LeadsDistribuicaoSection
                distribuicao={charts?.distribuicao ?? null}
                loading={loadingCharts}
              />
            </MotionReveal>
          </>
        ) : null}

        {!error && !isEmpty ? (
          <MotionReveal index={3}>
            <VendasSankeyChart
              totais={vendasSankeyData?.totais ?? null}
              fluxoCrosstab={vendasSankeyData?.fluxo_crosstab ?? null}
              loading={vendasSankeyLoading && !vendasSankeyData}
            />
          </MotionReveal>
        ) : null}

        {!error && !isEmpty ? (
          <MotionReveal index={4}>
            {listError ? (
              <PageErrorState
                title="Não conseguimos carregar a lista"
                message={listError}
                onRetry={refetchList}
              />
            ) : (
              <LeadsPeopleTable
                rows={listData?.rows ?? []}
                total={listData?.total ?? 0}
                page={listPage}
                pageSize={LIST_PAGE_SIZE}
                loading={listLoading && !listData}
                refreshing={listLoading}
                search={filters.busca}
                onSearchChange={(busca) => setFilters((prev) => ({ ...prev, busca }))}
                onPageChange={setListPage}
                onRefresh={refetchList}
              />
            )}
          </MotionReveal>
        ) : null}
      </div>
    </MainViewFluidShell>
  );
}
