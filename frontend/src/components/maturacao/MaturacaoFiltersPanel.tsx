import { Button } from '@/components/ui/button';
import { DateRangeInput } from '@/components/ui/date-range-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatPaginaSlugLabel } from '@/lib/leadEmpreendimento';
import { cn } from '@/lib/utils';
import {
  MATURACAO_PERIODO_RAPIDO_OPTIONS,
  type MaturacaoFilterOptions,
  type MaturacaoFilters,
  type MaturacaoPeriodoRapido,
} from '@/lib/maturacaoFilters';

type MaturacaoFiltersPanelProps = {
  value: MaturacaoFilters;
  onChange: (next: MaturacaoFilters) => void;
  onApply: () => void;
  onClear: () => void;
  onPeriodoRapido: (rapido: MaturacaoPeriodoRapido) => void;
  filterOptions: MaturacaoFilterOptions;
  className?: string;
};

export function MaturacaoFiltersPanel({
  value,
  onChange,
  onApply,
  onClear,
  onPeriodoRapido,
  filterOptions,
  className,
}: MaturacaoFiltersPanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-5 rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">Filtros de maturação</span>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" className="rounded-xl" onClick={onClear}>
            Limpar
          </Button>
          <Button type="button" size="sm" className="rounded-xl" onClick={onApply}>
            Aplicar
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium leading-none">Período de captação</span>
        <div className="flex flex-wrap gap-2">
          {MATURACAO_PERIODO_RAPIDO_OPTIONS.map((opt) => {
            const active = value.periodoRapido === opt.value;
            return (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                className={cn(
                  'h-8 rounded-lg text-xs font-medium sm:text-sm',
                  !active && 'border-border/60 bg-background/40',
                )}
                aria-pressed={active}
                onClick={() => onPeriodoRapido(opt.value)}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div className="space-y-2 sm:col-span-2">
          <span className="text-sm font-medium leading-none">Intervalo customizado</span>
          <DateRangeInput
            id="maturacao-periodo"
            value={{ from: value.dataInicial, to: value.dataFinal }}
            onChange={({ from, to }) =>
              onChange({ ...value, dataInicial: from, dataFinal: to, periodoRapido: 'custom' })
            }
          />
        </div>
        <FilterSelect
          label="Empreendimento"
          value={value.empreendimento}
          allLabel="Todos"
          options={filterOptions.empreendimentos.map((p) => ({
            value: p,
            label: formatPaginaSlugLabel(p),
          }))}
          onChange={(v) => onChange({ ...value, empreendimento: v })}
        />
        <FilterSelect
          label="Origem"
          value={value.origem}
          allLabel="Todas"
          options={filterOptions.origens.map((o) => ({ value: o, label: o }))}
          onChange={(v) => onChange({ ...value, origem: v })}
        />
        <FilterSelect
          label="Etapa atual"
          value={value.etapaAtual}
          allLabel="Todas"
          options={filterOptions.etapas.map((e) => ({ value: e, label: e }))}
          onChange={(v) => onChange({ ...value, etapaAtual: v })}
        />
        <FilterSelect
          label="Qualificação"
          value={value.qualificacao}
          allLabel="Todas"
          options={filterOptions.qualificacoes.map((q) => ({ value: q, label: q }))}
          onChange={(v) => onChange({ ...value, qualificacao: v })}
        />
        <FilterSelect
          label="Status de maturação"
          value={value.statusMaturacao}
          allLabel="Todos"
          options={filterOptions.statusMaturacao.map((s) => ({ value: s.value, label: s.label }))}
          onChange={(v) =>
            onChange({ ...value, statusMaturacao: v as MaturacaoFilters['statusMaturacao'] })
          }
        />
        <FilterSelect
          label="Responsável"
          value={value.responsavel}
          allLabel="Todos"
          options={filterOptions.responsaveis.map((r) => ({ value: r, label: r }))}
          onChange={(v) => onChange({ ...value, responsavel: v })}
        />
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  allLabel,
  options,
  onChange,
}: {
  label: string;
  value: string;
  allLabel: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium leading-none">{label}</span>
      <Select value={value || '__all__'} onValueChange={(v) => onChange(v === '__all__' ? '' : v)}>
        <SelectTrigger className="h-10 rounded-xl">
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{allLabel}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export { collectMaturacaoFilterOptions } from '@/lib/maturacaoFilters';
