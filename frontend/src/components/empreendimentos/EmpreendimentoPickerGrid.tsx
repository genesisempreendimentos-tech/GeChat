import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { EmpreendimentoPickerCard } from '@/components/empreendimentos/EmpreendimentoPickerCard';
import { Input } from '@/components/ui/input';
import type { EmpreendimentoMetrics } from '@/lib/empreendimentosMetrics';

type EmpreendimentoPickerGridProps = {
  metrics: EmpreendimentoMetrics[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function EmpreendimentoPickerGrid({
  metrics,
  selectedId,
  onSelect,
}: EmpreendimentoPickerGridProps) {
  const [search, setSearch] = useState('');

  const visibleMetrics = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = metrics.filter(
      (m) => m.empreendimentoId !== '/' && m.empreendimentoNome.trim() !== '—',
    );
    if (!q) return list;
    return list.filter((m) => m.empreendimentoNome.toLowerCase().includes(q));
  }, [metrics, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Empreendimentos</h2>
          <p className="text-sm text-muted-foreground">
            Selecione um produto para ver performance, funil e origem
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar empreendimento..."
            className="rounded-xl pl-9"
          />
        </div>
      </div>

      {!visibleMetrics.length ? (
        <p className="rounded-xl border border-border/70 bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhum empreendimento encontrado.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleMetrics.map((metric) => (
            <EmpreendimentoPickerCard
              key={metric.empreendimentoId}
              metric={metric}
              selected={selectedId === metric.empreendimentoId}
              onSelect={() => onSelect(metric.empreendimentoId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
