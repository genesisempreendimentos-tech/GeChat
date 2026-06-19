import { useEffect, useMemo, useState } from 'react';
import { EmpreendimentosBigNumbers } from '@/components/empreendimentos/EmpreendimentosBigNumbers';
import {
  EmpreendimentosDonutCard,
  type EmpreendimentosDonutSlice,
} from '@/components/empreendimentos/EmpreendimentosDonutCard';
import { AdminBigBox } from '@/admin/components/AdminBigBox';
import { LoadingGifScreen } from '@/components/LoadingGif';
import { empreendimentoColorHex } from '@/lib/brandColors';
import { fetchEmpreendimentosAnalytics } from '@/services/empreendimentosService';
import type {
  EmpreendimentoGenesis,
  EmpreendimentosAnalyticsData,
  EmpreendimentosKindFilter,
} from '@/types/empreendimentos';

const COVERAGE_COLORS = {
  com: '#14b8a6',
  sem: '#94a3b8',
};

type EmpreendimentosAnalyticsViewProps = {
  isAdmin?: boolean;
  kindFilter?: EmpreendimentosKindFilter;
  empreendimentos?: EmpreendimentoGenesis[];
};

export function EmpreendimentosAnalyticsView({
  isAdmin = false,
  kindFilter = 'empreendimentos',
  empreendimentos = [],
}: EmpreendimentosAnalyticsViewProps) {
  const [data, setData] = useState<EmpreendimentosAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchEmpreendimentosAnalytics(isAdmin).then(({ data: payload, error: fetchError }) => {
      if (cancelled) return;
      if (fetchError) {
        setError(fetchError);
        setData(null);
      } else {
        setData(payload);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const coverageSlices = useMemo((): EmpreendimentosDonutSlice[] => {
    if (!data) return [];
    return [
      {
        key: 'empreendimentos',
        label: 'Interessados',
        count: data.interesse_coverage.pessoas_empreendimentos,
        color: COVERAGE_COLORS.com,
      },
      {
        key: 'troia',
        label: 'Indefinidos',
        count: data.interesse_coverage.pessoas_troia,
        color: COVERAGE_COLORS.sem,
      },
    ];
  }, [data]);

  const allowedEmpIds = useMemo(() => {
    const ids = empreendimentos
      .filter((item) =>
        kindFilter === 'troia' ? Boolean(item.is_trojan) : !item.is_trojan,
      )
      .map((item) => item.id);
    return new Set(ids);
  }, [empreendimentos, kindFilter]);

  const porEmpreendimentoSlices = useMemo((): EmpreendimentosDonutSlice[] => {
    if (!data) return [];
    return data.por_empreendimento
      .filter((row) => allowedEmpIds.has(row.id))
      .map((row) => ({
        key: String(row.id),
        label: row.nome,
        count: row.count,
        color: empreendimentoColorHex(row.cor),
      }));
  }, [data, allowedEmpIds]);

  const coverageTotal = data?.interesse_coverage.total ?? 0;
  const porEmpTotal = porEmpreendimentoSlices.reduce((sum, slice) => sum + slice.count, 0);

  if (error && !loading) {
    return (
      <AdminBigBox>
        <div className="py-12 text-center text-sm text-muted-foreground">{error}</div>
      </AdminBigBox>
    );
  }

  return (
    <div className="space-y-6">
      <EmpreendimentosBigNumbers bignumbers={data?.bignumbers ?? null} loading={loading} />

      {loading && !data ? (
        <AdminBigBox>
          <LoadingGifScreen className="h-64" />
        </AdminBigBox>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <EmpreendimentosDonutCard
            title="Interessados para Indefinidos"
            infoTooltip="Soma de pessoas únicas por empreendimento canônico: fatia Interessados (empreendimentos reais) e fatia Indefinidos (Troia). Uma pessoa pode contar nas duas se tiver interesse nos dois tipos."
            centerLabel="pessoas"
            slices={coverageSlices}
            total={coverageTotal}
            loading={loading}
          />
          <EmpreendimentosDonutCard
            title={
              kindFilter === 'troia'
                ? 'Percentual por Troia'
                : 'Percentual por empreendimento'
            }
            infoTooltip={
              kindFilter === 'troia'
                ? 'Pessoas únicas com interesse mapeado em empreendimentos Troia.'
                : 'Pessoas únicas por empreendimento canônico (quantos leads do Oasis?). Uma pessoa pode aparecer em mais de um empreendimento.'
            }
            centerLabel="pessoas"
            slices={porEmpreendimentoSlices}
            total={porEmpTotal}
            loading={loading}
            emptyMessage={
              kindFilter === 'troia'
                ? 'Nenhum Troia mapeado com leads no período.'
                : 'Nenhum empreendimento mapeado com leads no período.'
            }
          />
        </div>
      )}
    </div>
  );
}
