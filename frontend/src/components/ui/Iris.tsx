import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type IrisVariant =
  | 'iris1'
  | 'iris2'
  | 'iris4'
  | 'iris6'
  | 'iris11'
  | 'iris14'
  | 'iris19'
  | 'iris21'
  | 'iris23';

const VARIANT_CLASS: Record<IrisVariant, string> = {
  iris1: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25',
  iris2: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/25',
  iris4: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
  iris6: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  iris11: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/25',
  iris14: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25',
  iris19: 'bg-muted text-muted-foreground border-border/60',
  iris21: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/25',
  iris23: 'bg-zinc-500/10 text-foreground border-border/50',
};

type IrisProps = {
  text: ReactNode;
  variant?: IrisVariant;
  className?: string;
};

export function Iris({ text, variant = 'iris23', className }: IrisProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-xs font-medium leading-snug',
        VARIANT_CLASS[variant],
        className,
      )}
    >
      <span className="truncate">{text}</span>
    </span>
  );
}
