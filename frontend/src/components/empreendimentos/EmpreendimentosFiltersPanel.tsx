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
  EMPREENDIMENTOS_PERIODO_RAPIDO_OPTIONS,
  type EmpreendimentosFilterOptions,
  type EmpreendimentosFilters,
  type EmpreendimentosPeriodoRapido,
} from '@/lib/empreendimentosFilters';
import type { EmpreendimentoStatus } from '@/lib/empreendimentosMetrics';

type EmpreendimentosFiltersPanelProps = {
  value: EmpreendimentosFilters;
  onChange: (next: EmpreendimentosFilters) => void;
  onApply: () => void;
  onClear: () => void;
  onPeriodoRapido: (rapido: EmpreendimentosPeriodoRapido) => void;
  filterOptions: EmpreendimentosFilterOptions;
  className?: string;
};

export function EmpreendimentosFiltersPanel({
  value,
  onChange,
  onApply,
  onClear,
  onPeriodoRapido,
  filterOptions,
  className,
}: EmpreendimentosFiltersPanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-5 rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-sm font-medium text-foreground">Filtros de empreendimentos</span>
          <p className="mt-1 text-xs text-muted-foreground">
            Dados baseados nos leads captados no período selecionado e sua etapa atual no funil.
          </p>
        </div>
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
          {EMPREENDIMENTOS_PERIODO_RAPIDO_OPTIONS.map((opt) => {
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
            id="empreendimentos-periodo"
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
          label="Origem / canal"
          value={value.origem}
          allLabel="Todas"
          options={filterOptions.origens.map((o) => ({ value: o, label: o }))}
          onChange={(v) => onChange({ ...value, origem: v })}
        />
        <FilterSelect
          label="Etapa comercial"
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
          label="Status do empreendimento"
          value={value.statusEmpreendimento}
          allLabel="Todos"
          options={filterOptions.statusEmpreendimento.map((s) => ({
            value: s.value,
            label: s.label,
          }))}
          onChange={(v) =>
            onChange({
              ...value,
              statusEmpreendimento: v as EmpreendimentosFilters['statusEmpreendimento'],
            })
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

export { collectEmpreendimentosFilterOptions } from '@/lib/empreendimentosFilters';
