import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type SegmentedIconToggleOption<T extends string> = {
  value: T;
  label: string;
  icon: ReactNode;
};

export interface SegmentedIconToggleProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedIconToggleOption<T>[];
  className?: string;
  ariaLabel?: string;
}

export function SegmentedIconToggle<T extends string>({
  value,
  onValueChange,
  options,
  className,
  ariaLabel = 'Alternar opção',
}: SegmentedIconToggleProps<T>) {
  return (
    <div
      className={cn(
        'flex rounded-xl border border-border/60 bg-muted/30 p-1 shadow-sm transition-colors hover:border-border/80',
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              'flex h-8 items-center rounded-lg text-sm font-medium transition-all duration-300',
              active
                ? 'bg-primary px-3 text-primary-foreground shadow-md'
                : 'px-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
            onClick={() => onValueChange(option.value)}
            aria-pressed={active}
          >
            {option.icon}
            <AnimatePresence initial={false}>
              {active ? (
                <motion.span
                  key={`${option.value}-label`}
                  initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                  animate={{ width: 'auto', opacity: 1, marginLeft: 6 }}
                  exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {option.label}
                </motion.span>
              ) : null}
            </AnimatePresence>
          </button>
        );
      })}
    </div>
  );
}
