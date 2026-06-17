import { Calendar, Filter, Search } from 'lucide-react';
import type { LeadsFonteFilter, LeadsPanelFilters, LeadsPeriodoPreset } from '@/types/leadsOverview';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const PERIODO_OPTIONS: { value: LeadsPeriodoPreset; label: string }[] = [
  { value: '90d', label: 'Últimos 90 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '12m', label: 'Últimos 12 meses' },
  { value: 'ytd', label: 'Ano atual' },
  { value: 'todos', label: 'Todo o período' },
];

const FONTE_OPTIONS: { value: LeadsFonteFilter; label: string }[] = [
  { value: 'todos', label: 'Todas as fontes' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'externo', label: 'Externo' },
];

const CANAL_OPTIONS = [
  { value: '', label: 'Todos os canais' },
  { value: 'Site forms', label: 'Site forms' },
  { value: 'Meta Forms', label: 'Meta Forms' },
  { value: 'Painel CV', label: 'Painel CV' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Outros', label: 'Outros' },
];

type LeadsFiltersBarProps = {
  value: LeadsPanelFilters;
  onChange: (next: LeadsPanelFilters) => void;
  showSearch?: boolean;
};

export function LeadsFiltersBar({ value, onChange, showSearch = true }: LeadsFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showSearch ? (
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 rounded-xl pl-8"
            placeholder="Buscar nome, e-mail ou telefone"
            value={value.busca}
            onChange={(e) => onChange({ ...value, busca: e.target.value })}
          />
        </div>
      ) : null}
      <Select
        value={value.periodo}
        onValueChange={(periodo) => onChange({ ...value, periodo: periodo as LeadsPeriodoPreset })}
      >
        <SelectTrigger className="h-9 w-[160px] rounded-xl">
          <Calendar className="mr-2 h-4 w-4 shrink-0 opacity-60" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIODO_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={value.canal || '__all'}
        onValueChange={(canal) =>
          onChange({ ...value, canal: canal === '__all' ? '' : canal })
        }
      >
        <SelectTrigger className="h-9 w-[170px] rounded-xl">
          <Filter className="mr-2 h-4 w-4 shrink-0 opacity-60" />
          <SelectValue placeholder="Canal" />
        </SelectTrigger>
        <SelectContent>
          {CANAL_OPTIONS.map((opt) => (
            <SelectItem key={opt.value || '__all'} value={opt.value || '__all'}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={value.fonte}
        onValueChange={(fonte) => onChange({ ...value, fonte: fonte as LeadsFonteFilter })}
      >
        <SelectTrigger className="h-9 w-[150px] rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONTE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        className="h-9 w-[160px] rounded-xl"
        placeholder="Empreendimento"
        value={value.empreendimento}
        onChange={(e) => onChange({ ...value, empreendimento: e.target.value })}
      />
      <Input
        className="h-9 w-[150px] rounded-xl"
        placeholder="Situação CV"
        value={value.situacao_cv}
        onChange={(e) => onChange({ ...value, situacao_cv: e.target.value })}
      />
    </div>
  );
}
