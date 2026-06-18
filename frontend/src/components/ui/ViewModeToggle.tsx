import { LayoutGrid, Table2 } from 'lucide-react';
import { SegmentedIconToggle } from '@/components/ui/SegmentedIconToggle';

export type ViewMode = 'table' | 'cards';

export interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
  tableLabel?: string;
  cardsLabel?: string;
}

const VIEW_MODE_OPTIONS = [
  {
    value: 'table' as const,
    label: 'Tabela',
    icon: <Table2 className="h-4 w-4 shrink-0" />,
  },
  {
    value: 'cards' as const,
    label: 'Cards',
    icon: <LayoutGrid className="h-4 w-4 shrink-0" />,
  },
];

export function ViewModeToggle({
  viewMode,
  onViewModeChange,
  className,
  tableLabel = 'Tabela',
  cardsLabel = 'Cards',
}: ViewModeToggleProps) {
  const options = VIEW_MODE_OPTIONS.map((opt) => ({
    ...opt,
    label: opt.value === 'table' ? tableLabel : cardsLabel,
  }));

  return (
    <SegmentedIconToggle
      value={viewMode}
      onValueChange={onViewModeChange}
      options={options}
      className={className}
      ariaLabel="Alternar visualização"
    />
  );
}
