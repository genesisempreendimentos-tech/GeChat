import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

const MotionButton = motion(Button);

interface ViewButtonNavbarProps extends ButtonProps {
  active?: boolean;
  Icon: LucideIcon;
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
    'rounded-xl size-9 flex items-center justify-center', // Mudei para arredondamento padrão do sistema (xl) e tamanho 9 para igualar o resto do topbar
    'transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/40',
    'border-[2px]', // borda mais sutil
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
    <MotionButton
      ref={ref}
      type="button"
      variant="ghost"
      size="icon"
      aria-pressed={active}
      onClick={onClick}
      className={btnClass}
      whileTap={{ scale: 0.9, rotate: 10 }}
      {...props}
    >
      <Icon className="w-4 h-4 shrink-0" />
    </MotionButton>
  );
});

ViewButtonNavbar.displayName = 'ViewButtonNavbar';
export default ViewButtonNavbar;
