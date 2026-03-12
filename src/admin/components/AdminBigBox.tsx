import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AdminBigBoxProps {
  children: ReactNode;
  className?: string;
}

export function AdminBigBox({ children, className }: AdminBigBoxProps) {
  return (
    <div
      className={cn(
        'min-h-[200px] rounded-lg border border-border/70 bg-card/30 dark:bg-card/20 p-4 md:p-6',
        className
      )}
    >
      {children}
    </div>
  );
}
