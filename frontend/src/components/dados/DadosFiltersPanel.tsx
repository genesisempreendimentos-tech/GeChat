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
  DADOS_BALANCO_OPTIONS,
  collectDadosFilterOptions,
  type DadosFilterOptions,
  type DadosFilters,
} from '@/lib/dadosFilters';
import {
  LEADS_METRICA_FILTRO_OPTIONS,
  type LeadMetricaFiltro,
} from '@/lib/leadsControlLine';

type DadosFiltersPanelProps = {
  value: DadosFilters;
  onChange: (next: DadosFilters) => void;
  onApply: () => void;
  onClear: () => void;
  onMetricaSelect?: (metrica: LeadMetricaFiltro) => void;
  filterOptions: DadosFilterOptions;
  className?: string;
};

export function DadosFiltersPanel({
  value,
  onChange,
  onApply,
  onClear,
  onMetricaSelect,
  filterOptions,
  className,
}: DadosFiltersPanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-5 rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">Filtros analíticos</span>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" className="rounded-xl" onClick={onClear}>
            Limpar
          </Button>
          <Button type="button" size="sm" className="rounded-xl" onClick={onApply}>
            Aplicar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <span className="text-sm font-medium leading-none">Período</span>
          <DateRangeInput
            id="dados-periodo"
            value={{ from: value.dataInicial, to: value.dataFinal }}
            onChange={({ from, to }) =>
              onChange({ ...value, dataInicial: from, dataFinal: to })
            }
          />
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium leading-none">Empreendimento</span>
          <Select
            value={value.empreendimento || '__all__'}
            onValueChange={(v) => onChange({ ...value, empreendimento: v === '__all__' ? '' : v })}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {filterOptions.empreendimentos.map((pagina) => (
                <SelectItem key={pagina} value={pagina}>
                  {formatPaginaSlugLabel(pagina)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium leading-none">Origem</span>
          <Select
            value={value.origem || '__all__'}
            onValueChange={(v) => onChange({ ...value, origem: v === '__all__' ? '' : v })}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {filterOptions.origens.map((origem) => (
                <SelectItem key={origem} value={origem}>
                  {origem}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium leading-none">Dispositivo</span>
          <Select
            value={value.dispositivo || '__all__'}
            onValueChange={(v) => onChange({ ...value, dispositivo: v === '__all__' ? '' : v })}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {filterOptions.dispositivos.map((dispositivo) => (
                <SelectItem key={dispositivo} value={dispositivo}>
                  {dispositivo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium leading-none">Canal / campanha</span>
          <Select
            value={value.canal || '__all__'}
            onValueChange={(v) => onChange({ ...value, canal: v === '__all__' ? '' : v })}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {filterOptions.canais.map((canal) => (
                <SelectItem key={canal} value={canal}>
                  {canal}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium leading-none">Qualificação</span>
          <Select
            value={value.qualificacao || '__all__'}
            onValueChange={(v) => onChange({ ...value, qualificacao: v === '__all__' ? '' : v })}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {filterOptions.qualificacoes.map((q) => (
                <SelectItem key={q} value={q}>
                  {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium leading-none">Etapa atual</span>
          <Select
            value={value.etapaAtual || '__all__'}
            onValueChange={(v) => onChange({ ...value, etapaAtual: v === '__all__' ? '' : v })}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {filterOptions.etapas.map((etapa) => (
                <SelectItem key={etapa} value={etapa}>
                  {etapa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium leading-none">Visão da análise</span>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: 'entrada' as const, label: 'Entrada de leads' },
              { value: 'maturacao' as const, label: 'Maturação dos leads' },
            ] as const
          ).map((opt) => {
            const active = value.visao === opt.value;
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
                onClick={() => onChange({ ...value, visao: opt.value })}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium leading-none">Comparação de período</span>
        <div className="flex flex-wrap gap-2">
          {DADOS_BALANCO_OPTIONS.map((opt) => {
            const active = value.balanco === opt.value;
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
                onClick={() => onChange({ ...value, balanco: opt.value })}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium leading-none">Métrica</span>
        <div className="flex flex-wrap gap-2">
          {LEADS_METRICA_FILTRO_OPTIONS.map((opt) => {
            const active = value.metrica === opt.value;
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
                onClick={() => {
                  onChange({ ...value, metrica: opt.value });
                  onMetricaSelect?.(opt.value);
                }}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { collectDadosFilterOptions };
