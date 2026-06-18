import { cn } from '@/lib/utils';
import { getLeadDisplayId, isGeleadsId } from '@/lib/leadDisplayId';

type Props = {
  id?: string | null;
  codigo?: string | null;
  geleadsId?: string | null;
  className?: string;
};

/** Badge com GêLeads ID (geleads_id) ou fallback legado. */
export function LeadDisplayIdBadge({ id, codigo, geleadsId, className }: Props) {
  const code = getLeadDisplayId({ id, codigo, geleads_id: geleadsId });
  const isRealGeleadsId = isGeleadsId(geleadsId ?? codigo);

  if (!isRealGeleadsId && code === 'A0000') {
    return <span className={cn('text-muted-foreground', className)}>—</span>;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5',
        'font-mono text-xs font-semibold tabular-nums tracking-tight text-primary',
        className,
      )}
    >
      {code}
    </span>
  );
}
