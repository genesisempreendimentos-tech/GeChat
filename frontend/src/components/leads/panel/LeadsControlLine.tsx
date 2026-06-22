import { AdminControlLine } from '@/admin/components/AdminControlLine';
import { DateRangeInput } from '@/components/ui/date-range-input';
import type { LeadsPanelFilters } from '@/types/leadsOverview';

type LeadsControlLineProps = {
  filters: LeadsPanelFilters;
  onFiltersChange: (next: LeadsPanelFilters) => void;
};

export function LeadsControlLine({ filters, onFiltersChange }: LeadsControlLineProps) {
  return (
    <AdminControlLine
      showViewToggle={false}
      leftContent={
        <DateRangeInput
          id="leads-periodo"
          value={{ from: filters.created_de ?? '', to: filters.created_ate ?? '' }}
          onChange={({ from, to }) =>
            onFiltersChange({
              ...filters,
              created_de: from,
              created_ate: to,
            })
          }
          placeholder="Todo o período"
          className="h-9 w-[min(100%,20rem)] rounded-xl border-border/60 bg-muted/50 text-sm shadow-sm"
        />
      }
    />
  );
}
