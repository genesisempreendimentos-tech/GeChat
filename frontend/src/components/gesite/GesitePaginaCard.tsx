import { Globe } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type GesitePaginaCardRow = {
  id: string;
  nome: string;
  leads: number;
  ultimoLeadIso: string;
  perfilPct: number;
  qualificacaoPct: number;
};

type Props = {
  row: GesitePaginaCardRow;
  className?: string;
};

function formatUltimoLead(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function formatPct(v: number): string {
  return `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function GesitePaginaCard({ row, className }: Props) {
  return (
    <Card className={cn('flex h-full flex-col overflow-hidden border-l-4 border-primary/25 transition-shadow hover:shadow-md', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <Globe className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">{row.nome}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {row.leads.toLocaleString('pt-BR')} leads
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 pb-4 pt-0 text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground/80">Último lead:</span> {formatUltimoLead(row.ultimoLeadIso)}
        </p>
        <p>
          <span className="font-medium text-foreground/80">Perfil completo:</span> {formatPct(row.perfilPct)}
        </p>
        <p>
          <span className="font-medium text-foreground/80">Qualificação:</span> {formatPct(row.qualificacaoPct)}
        </p>
      </CardContent>
    </Card>
  );
}
