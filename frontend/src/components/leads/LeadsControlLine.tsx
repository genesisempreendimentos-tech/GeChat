import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LEADS_METRICA_FILTRO_OPTIONS,
  type LeadMetricaFiltro,
  type LeadsPageControlFilters,
} from '@/lib/leadsControlLine';

type LeadsControlLineProps = {
  value: LeadsPageControlFilters;
  onChange: (next: LeadsPageControlFilters) => void;
  onApply: () => void;
  onClear: () => void;
  onMetricaSelect?: (metrica: LeadMetricaFiltro) => void;
  variant?: 'leads' | 'default';
  className?: string;
};

export function LeadsControlLine({
  value,
  onChange,
  onApply,
  onClear,
  onMetricaSelect,
  variant = 'default',
  className,
}: LeadsControlLineProps) {
  void onApply;

  const showMetricaFiltros = variant === 'leads';

  if (!showMetricaFiltros) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">Métrica</span>
        <Button type="button" size="sm" variant="secondary" className="rounded-xl" onClick={onClear}>
          Limpar
        </Button>
      </div>
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
  );
}
