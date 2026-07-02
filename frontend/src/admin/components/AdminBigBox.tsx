import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ADMIN_PANEL_BOX } from '@/lib/translucentBigBox';

interface AdminBigBoxProps {
  children: ReactNode;
  className?: string;
}

export function AdminBigBox({ children, className }: AdminBigBoxProps) {
  return (
    <div
      className={cn(
        ADMIN_PANEL_BOX,
        'p-4 md:p-6',
        className
      )}
    >
      {children}
    </div>
  );
}
