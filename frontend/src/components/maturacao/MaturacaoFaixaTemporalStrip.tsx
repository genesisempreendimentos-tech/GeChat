import { CalendarRange } from 'lucide-react';
import { MotionReveal } from '@/components/motion/AppMotion';
import {
  MATURACAO_FAIXA_TEMPORAL_OPTIONS,
  type MaturacaoFaixaTemporal,
} from '@/lib/maturacaoFilters';
import { cn } from '@/lib/utils';

type MaturacaoFaixaTemporalStripProps = {
  value: MaturacaoFaixaTemporal;
  onChange: (faixa: Exclude<MaturacaoFaixaTemporal, 'custom'>) => void;
  className?: string;
};

export function MaturacaoFaixaTemporalStrip({
  value,
  onChange,
  className,
}: MaturacaoFaixaTemporalStripProps) {
  return (
    <MotionReveal index={0}>
      <div
        role="group"
        aria-label="Faixa temporal de maturação"
        className={cn(
          'rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm backdrop-blur-sm dark:bg-card/60 sm:p-4',
          className,
        )}
      >
        <div className="mb-3 flex items-center gap-2 px-1">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarRange className="size-4" strokeWidth={2.25} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Período de maturação</p>
            <p className="text-xs text-muted-foreground">
              Idade do lead desde a captação até hoje
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {MATURACAO_FAIXA_TEMPORAL_OPTIONS.map((opt) => {
            const active = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(opt.value)}
                className={cn(
                  'group flex min-h-[4.5rem] flex-col items-start justify-center rounded-xl border px-4 py-3 text-left transition-all duration-200',
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20 ring-2 ring-primary/30'
                    : 'border-border/60 bg-background/50 hover:border-primary/40 hover:bg-muted/40',
                )}
              >
                <span
                  className={cn(
                    'text-sm font-semibold leading-tight',
                    active ? 'text-primary-foreground' : 'text-foreground',
                  )}
                >
                  {opt.label}
                </span>
                <span
                  className={cn(
                    'mt-1 text-xs',
                    active ? 'text-primary-foreground/80' : 'text-muted-foreground',
                  )}
                >
                  {opt.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </MotionReveal>
  );
}
