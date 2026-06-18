import type { HistoricoFilters, HistoricoTipo } from '@/types/historico';
import { HISTORICO_TIPO_LABELS } from '@/lib/historicoFormat';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const ALL_TIPOS: HistoricoTipo[] = [
  'lead_criado',
  'lead_mudou_situacao',
  'reserva_criada',
  'reserva_mudou_situacao',
];

type HistoricoFiltersBarProps = {
  filters: HistoricoFilters;
  empreendimentos: { id: number; nome: string }[];
  onToggleTipo: (tipo: HistoricoTipo) => void;
  onChange: (patch: Partial<HistoricoFilters>) => void;
};

export function HistoricoFiltersBar({
  filters,
  empreendimentos,
  onToggleTipo,
  onChange,
}: HistoricoFiltersBarProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {ALL_TIPOS.map((tipo) => {
          const active = filters.tipos.includes(tipo);
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => onToggleTipo(tipo)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              {HISTORICO_TIPO_LABELS[tipo]}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          value={filters.busca}
          onChange={(e) => onChange({ busca: e.target.value })}
          placeholder="Buscar lead ou ID…"
          className="h-10 rounded-xl"
        />
        <select
          value={filters.empreendimento}
          onChange={(e) => onChange({ empreendimento: e.target.value })}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos empreendimentos</option>
          {empreendimentos.map((emp) => (
            <option key={emp.id} value={emp.nome}>
              {emp.nome}
            </option>
          ))}
        </select>
        <Input
          type="date"
          value={filters.data_de}
          onChange={(e) => onChange({ data_de: e.target.value })}
          className="h-10 rounded-xl"
          aria-label="Data inicial"
        />
        <Input
          type="date"
          value={filters.data_ate}
          onChange={(e) => onChange({ data_ate: e.target.value })}
          className="h-10 rounded-xl"
          aria-label="Data final"
        />
      </div>
    </div>
  );
}
