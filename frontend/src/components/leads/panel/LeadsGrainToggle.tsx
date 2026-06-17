import { Hash, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LeadsDistribuicaoGrain } from '@/types/leadsOverview';

type LeadsGrainToggleProps = {
  value: LeadsDistribuicaoGrain;
  onChange: (value: LeadsDistribuicaoGrain) => void;
  className?: string;
};

export function LeadsGrainToggle({ value, onChange, className }: LeadsGrainToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/40 p-0.5',
        className,
      )}
    >
      <button
        type="button"
        aria-pressed={value === 'cadastros'}
        onClick={() => onChange('cadastros')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
          value === 'cadastros'
            ? 'bg-primary/10 text-primary shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Hash className="h-3.5 w-3.5" />
        Cadastros
      </button>
      <button
        type="button"
        aria-pressed={value === 'pessoas'}
        onClick={() => onChange('pessoas')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
          value === 'pessoas'
            ? 'bg-primary/10 text-primary shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Users className="h-3.5 w-3.5" />
        Pessoas
      </button>
    </div>
  );
}
