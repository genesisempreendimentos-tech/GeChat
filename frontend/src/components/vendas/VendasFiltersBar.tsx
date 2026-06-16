import { Calendar, Building2, Landmark } from 'lucide-react';
import type { VendasFilters, VendasPeriodoPreset } from '@/types/vendas';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const PERIODO_OPTIONS: { value: VendasPeriodoPreset; label: string }[] = [
  { value: 'todos', label: 'Todo o período' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'ytd', label: 'Ano atual' },
  { value: '12m', label: 'Últimos 12 meses' },
];

type VendasFiltersBarProps = {
  value: VendasFilters;
  onChange: (next: VendasFilters) => void;
};

export function VendasFiltersBar({ value, onChange }: VendasFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value.periodo}
        onValueChange={(periodo) =>
          onChange({ ...value, periodo: periodo as VendasPeriodoPreset })
        }
      >
        <SelectTrigger className="h-9 w-[min(100%,11rem)] rounded-xl border-border/60 bg-background/80">
          <Calendar className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {PERIODO_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative min-w-[10rem] flex-1 sm:max-w-[14rem]">
        <Building2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value.empreendimento}
          onChange={(e) => onChange({ ...value, empreendimento: e.target.value })}
          placeholder="Empreendimento"
          className="h-9 rounded-xl border-border/60 bg-background/80 pl-8"
        />
      </div>

      <div className="relative min-w-[10rem] flex-1 sm:max-w-[14rem]">
        <Landmark className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value.imobiliaria}
          onChange={(e) => onChange({ ...value, imobiliaria: e.target.value })}
          placeholder="Imobiliária"
          className="h-9 rounded-xl border-border/60 bg-background/80 pl-8"
        />
      </div>
    </div>
  );
}
