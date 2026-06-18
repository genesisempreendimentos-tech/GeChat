import { Badge } from '@/components/ui/badge';
import { Iris } from '@/components/ui/Iris';
import { canalColor } from '@/lib/leadsPanelColors';
import { normalizeCanalBucketLabel } from '@/lib/leadsCanalLabels';
import { leadIrisVariantQualificacao } from '@/lib/leadQualificacaoIris';
import type { LeadsQualificacaoStatus } from '@/types/leadsList';
import { cn } from '@/lib/utils';

export function dash(value: string | null | undefined): string {
  const t = value?.trim();
  return t ? t : '—';
}

export function formatBirthDatePtBr(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return '—';
  return `${d}/${m}/${y}`;
}

export function LeadCanalBucketCell({ bucket }: { bucket: string }) {
  const label = normalizeCanalBucketLabel(bucket);
  const color = canalColor(label);
  return (
    <Badge
      variant="outline"
      className="rounded-md border-0 font-medium"
      style={{
        color,
        backgroundColor: `${color}22`,
      }}
    >
      {label}
    </Badge>
  );
}

export function LeadQualificacaoIrisCell({ value }: { value: LeadsQualificacaoStatus }) {
  return (
    <Iris text={value} variant={leadIrisVariantQualificacao(value)} className="max-w-[12rem]" />
  );
}

export function LeadCvcrmCell({
  cvcrmLeadId,
}: {
  cvcrmLeadId: string | null;
}) {
  const synced = Boolean(cvcrmLeadId?.trim());
  return (
    <span
      className="inline-flex flex-col leading-tight"
      title={synced ? `cvcrm_lead_id: ${cvcrmLeadId}` : undefined}
    >
      <span>{synced ? 'Sim' : 'Não'}</span>
      {synced ? (
        <span className="text-[10px] text-muted-foreground tabular-nums">#{cvcrmLeadId}</span>
      ) : null}
    </span>
  );
}

export function LeadObservacoesCell({ value }: { value: string | null }) {
  const text = dash(value);
  if (text === '—') {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <span className={cn('line-clamp-2 max-w-[18rem] text-xs text-muted-foreground')}>{text}</span>
  );
}
