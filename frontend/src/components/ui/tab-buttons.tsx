import { AnimatePresence, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppMotion } from '@/hooks/useAppMotion';
import { cn } from '@/lib/utils';

export interface TabButtonItem<T extends string> {
  value: T;
  label: string;
  Icon: LucideIcon;
  tooltip?: string;
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
        'inline-flex w-fit flex-wrap rounded-xl border border-border/60 p-1 bg-muted/30 shadow-sm transition-colors hover:border-border/80',
        className
      )}
      role="group"
    >
      {items.map(({ value: itemValue, label, Icon, tooltip }) => {
        const isActive = value === itemValue;
        const button = (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 rounded-lg text-sm font-medium transition-all duration-300 flex items-center',
              isActive
                ? 'bg-primary text-primary-foreground shadow-md px-3'
                : 'px-2 text-muted-foreground hover:text-foreground hover:bg-muted/60',
            )}
            onClick={() => onChange(itemValue)}
            aria-pressed={isActive}
            aria-label={label}
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

        if (!tooltip) return <span key={itemValue}>{button}</span>;

        return (
          <Tooltip key={itemValue} delayDuration={200}>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-sm">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

/** Alias canônico — use `TabButton` quando pedir tab button no produto. */
export const TabButton = TabButtons;
