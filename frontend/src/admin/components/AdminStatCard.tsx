import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRANSLUCENT_BIG_BOX } from '@/lib/translucentBigBox';

interface AdminStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}

export function AdminStatCard({ icon: Icon, label, value, hint, className }: AdminStatCardProps) {
  return (
    <div
      className={cn(
        TRANSLUCENT_BIG_BOX,
        'p-4 flex flex-col gap-2 min-h-[108px]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="w-4 h-4 text-primary/80 shrink-0" aria-hidden />
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
