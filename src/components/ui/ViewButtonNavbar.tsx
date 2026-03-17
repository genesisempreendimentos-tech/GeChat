import React from 'react';
import type { ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface ViewButtonNavbarProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDrag' | 'onDragEnd' | 'onDragStart'> {
  active?: boolean;
  Icon: LucideIcon;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}

/**
 * Botão ícone circular para navbar.
 */
const ViewButtonNavbar = React.forwardRef<HTMLButtonElement, ViewButtonNavbarProps>(({
  active = false,
  onClick,
  Icon,
  className,
  ...props
}, ref) => {
  const btnClass = cn(
    'inline-flex items-center justify-center rounded-xl size-9 shrink-0',
    'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
    'border-[2px] cursor-pointer',
    active ? [
      'bg-primary dark:bg-primary',
      'text-primary-foreground dark:text-primary-foreground',
      'border-border/50',
      'hover:bg-primary/90 dark:hover:bg-primary/90',
    ].join(' ') : [
      'bg-transparent',
      'text-muted-foreground',
      'border-transparent',
      'hover:bg-primary/10',
      'hover:text-foreground',
    ].join(' '),
    className
  );

  return (
    <motion.button
      ref={ref}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={btnClass}
      whileTap={{ scale: 0.9, rotate: 10 }}
      {...props}
    >
      <Icon className="w-4 h-4 shrink-0" />
    </motion.button>
  );
});

ViewButtonNavbar.displayName = 'ViewButtonNavbar';
export default ViewButtonNavbar;
