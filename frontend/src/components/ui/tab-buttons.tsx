import { AnimatePresence, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppMotion } from '@/hooks/useAppMotion';
import { cn } from '@/lib/utils';

export interface TabButtonItem<T extends string> {
  value: T;
  label: string;
  Icon: LucideIcon;
}

interface TabButtonsProps<T extends string> {
  value: T;
  items: ReadonlyArray<TabButtonItem<T>>;
  onChange: (value: T) => void;
  className?: string;
}

export function TabButtons<T extends string>({
  value,
  items,
  onChange,
  className,
}: TabButtonsProps<T>) {
  const motionCfg = useAppMotion();

  return (
    <div
      className={cn(
        'flex rounded-xl border border-border/60 p-1 bg-muted/30 shadow-sm transition-colors hover:border-border/80',
        className
      )}
    >
      {items.map(({ value: itemValue, label, Icon }) => {
        const isActive = value === itemValue;
        return (
          <Button
            key={itemValue}
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 rounded-lg text-sm font-medium transition-all duration-300 flex items-center',
              isActive
                ? 'bg-primary text-primary-foreground shadow-md px-3'
                : 'px-2 text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
            onClick={() => onChange(itemValue)}
            aria-pressed={isActive}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <AnimatePresence initial={false}>
              {isActive && (
                <motion.span
                  initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                  animate={{ width: 'auto', opacity: 1, marginLeft: 6 }}
                  exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                  transition={motionCfg.springSoft}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        );
      })}
    </div>
  );
}
