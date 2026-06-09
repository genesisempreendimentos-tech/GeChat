import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  GESITE_BALANCO_OPTIONS,
  collectGesiteDadosFilterOptions,
  type GesiteDadosFilterOptions,
  type GesiteDadosFilters,
} from '@/lib/gesiteDadosFilters';
import {
  GESITE_METRICA_FILTRO_OPTIONS,
  type GesiteMetricaFiltro,
} from '@/lib/gesiteControlLine';

type GesiteDadosFiltersPanelProps = {
  value: GesiteDadosFilters;
  onChange: (next: GesiteDadosFilters) => void;
  onApply: () => void;
  onClear: () => void;
  onMetricaSelect?: (metrica: GesiteMetricaFiltro) => void;
  filterOptions: GesiteDadosFilterOptions;
  className?: string;
};

function formatPaginaLabel(path: string): string {
  const slug = path.replace(/^\//, '') || 'home';
  return slug
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function GesiteDadosFiltersPanel({
  value,
  onChange,
  onApply,
  onClear,
  onMetricaSelect,
  filterOptions,
  className,
}: GesiteDadosFiltersPanelProps) {
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="space-y-2">
          <span className="text-sm font-medium leading-none">Data inicial</span>
          <Input
            id="gesite-data-inicial"
            type="date"
            value={value.dataInicial}
            onChange={(e) => onChange({ ...value, dataInicial: e.target.value })}
            className="h-10 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium leading-none">Data final</span>
          <Input
            id="gesite-data-final"
            type="date"
            value={value.dataFinal}
            onChange={(e) => onChange({ ...value, dataFinal: e.target.value })}
            className="h-10 rounded-xl"
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
                  {formatPaginaLabel(pagina)}
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
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium leading-none">Comparação de período</span>
        <div className="flex flex-wrap gap-2">
          {GESITE_BALANCO_OPTIONS.map((opt) => {
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
          {GESITE_METRICA_FILTRO_OPTIONS.map((opt) => {
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

export { collectGesiteDadosFilterOptions };
