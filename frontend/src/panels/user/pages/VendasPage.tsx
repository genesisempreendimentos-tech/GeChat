import { useMemo, useState } from 'react';
import { HandCoins } from 'lucide-react';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { MainViewHeader } from '@/components/layout/header';
import { VendasFiltersBar } from '@/components/vendas/VendasFiltersBar';
import { VendasBigNumbers } from '@/components/vendas/VendasBigNumbers';
import { VendasDurabilidadeBar } from '@/components/vendas/VendasDurabilidadeBar';
import { VendasSankeyChart } from '@/components/vendas/VendasSankeyChart';
import { VendasTopRankingChart } from '@/components/vendas/VendasTopRankingChart';
import { VendasCorretoresTable } from '@/components/vendas/VendasCorretoresTable';
import { VendasEmptyState, VendasErrorState } from '@/components/vendas/VendasPageStates';
import { useVendas } from '@/hooks/useVendas';
import type { VendasFilters, VendasTopItem } from '@/types/vendas';
import { MotionReveal } from '@/components/motion/AppMotion';

const DEFAULT_FILTERS: VendasFilters = {
  periodo: 'todos',
  empreendimento: '',
  imobiliaria: '',
};

export default function VendasPage() {
  const [filters, setFilters] = useState<VendasFilters>(DEFAULT_FILTERS);
  const { data, loading, error, refetch, isEmpty } = useVendas(filters);

  const topCorretores: VendasTopItem[] = useMemo(
    () =>
      (data?.ranking ?? [])
        .filter((r) => r.valor_vendas > 0)
        .slice(0, 10)
        .map((r) => ({
          id: r.idcorretor,
          label: r.nome ?? `Corretor ${r.idcorretor}`,
          valor: r.valor_vendas,
          vendas: r.vendas,
        })),
    [data?.ranking],
  );

  const topImobiliarias: VendasTopItem[] = useMemo(
    () =>
      (data?.ranking_imobiliarias ?? []).map((r, i) => ({
        id: `${r.imobiliaria}-${i}`,
        label: r.imobiliaria,
        valor: r.valor_vendas,
        vendas: r.vendas,
      })),
    [data?.ranking_imobiliarias],
  );

  const showContent = !error && !isEmpty;

  return (
    <MainViewFluidShell>
      <MainViewHeader
        icon={<HandCoins className="h-6 w-6" />}
        title="Vendas"
        description="Carteira da Genesis · base completa do CVCRM"
        button={<VendasFiltersBar value={filters} onChange={setFilters} />}
      />

      <div className="mt-8 flex flex-col gap-8">
        {error ? <VendasErrorState message={error} onRetry={refetch} /> : null}

        {!error && isEmpty && !loading ? (
          <VendasEmptyState
            onClearFilters={
              filters.periodo !== 'todos' || filters.empreendimento || filters.imobiliaria
                ? () => setFilters(DEFAULT_FILTERS)
                : undefined
            }
          />
        ) : (
          <VendasBigNumbers totais={data?.totais ?? null} loading={loading && !data} />
        )}

        {showContent || (loading && !error) ? (
          <>
            <MotionReveal index={1}>
              <VendasDurabilidadeBar
                durabilidade={data?.totais.durabilidade ?? null}
                vendasEfetuadas={data?.totais.vendas_efetuadas}
                loading={loading && !data}
              />
            </MotionReveal>

            <MotionReveal index={2}>
              <VendasSankeyChart
                totais={data?.totais ?? null}
                fluxoCrosstab={data?.fluxo_crosstab ?? null}
                loading={loading && !data}
              />
            </MotionReveal>

            <div className="grid gap-6 lg:grid-cols-2">
              <MotionReveal index={3}>
                <VendasTopRankingChart
                  title="Top 10 corretores"
                  description="Melhores corretores por valor de venda efetuada."
                  items={topCorretores}
                  loading={loading && !data}
                />
              </MotionReveal>
              <MotionReveal index={4}>
                <VendasTopRankingChart
                  title="Top 10 imobiliárias"
                  description="Imobiliárias com maior volume de vendas efetuadas."
                  items={topImobiliarias}
                  loading={loading && !data}
                />
              </MotionReveal>
            </div>

            <MotionReveal index={5}>
              <VendasCorretoresTable rows={data?.ranking ?? []} loading={loading && !data} />
            </MotionReveal>
          </>
        ) : null}
      </div>
    </MainViewFluidShell>
  );
}
