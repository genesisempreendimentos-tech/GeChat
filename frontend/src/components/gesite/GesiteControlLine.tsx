import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { GesiteBalancoMode, GesitePageControlFilters } from '@/lib/gesiteControlLine';

type GesiteControlLineProps = {
  value: GesitePageControlFilters;
  onChange: (next: GesitePageControlFilters) => void;
  onApply: () => void;
  onClear: () => void;
  variant?: 'leads' | 'default';
  className?: string;
};

const BALANCO_OPTIONS: { value: GesiteBalancoMode; label: string }[] = [
  { value: 'desligado', label: 'Comparativo desligado' },
  { value: 'mes_anterior', label: 'vs. mês anterior' },
  { value: 'semana_anterior', label: 'vs. semana anterior' },
];

export function GesiteControlLine({
  value,
  onChange,
  onApply,
  onClear,
  variant = 'default',
  className,
}: GesiteControlLineProps) {
  void variant;

  return (
    <div
      className={cn(
        'mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex min-w-[12rem] flex-1 items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Balanço</span>
        <Select
          value={value.balanco}
          onValueChange={(balanco) =>
            onChange({ ...value, balanco: balanco as GesiteBalancoMode })
          }
        >
          <SelectTrigger className="h-9 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BALANCO_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="secondary" className="rounded-xl" onClick={onClear}>
          Limpar
        </Button>
        <Button type="button" size="sm" className="rounded-xl" onClick={onApply}>
          Aplicar filtros
        </Button>
      </div>
    </div>
  );
}
