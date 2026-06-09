import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ViewModeToggle, type ViewMode } from '@/components/ui/ViewModeToggle';
import { LEAD_SOURCE_LABELS } from '@/lib/dashboardLeadsMetrics';
import { cn } from '@/lib/utils';
import type { Lead } from '@/types/lead';
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from '@/types/lead';

const PAGE_SIZE = 20;

type Props = {
  leads: Lead[];
  className?: string;
};

function formatLeadDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, 'dd/MM/yyyy HH:mm', { locale: ptBR });
}

function DashboardLeadMiniCard({ lead }: { lead: Lead }) {
  return (
    <Card className="group border-l-4 border-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="space-y-1 p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-semibold leading-tight">{lead.name}</p>
          <Badge className={cn('shrink-0', LEAD_STATUS_COLORS[lead.status])}>
            {LEAD_STATUS_LABELS[lead.status]}
          </Badge>
        </div>
        <CardDescription className="truncate text-xs">
          {lead.company ?? lead.email ?? lead.phone ?? '—'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 px-4 pb-4 pt-0 text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground/80">Origem:</span>{' '}
          {LEAD_SOURCE_LABELS[lead.source] ?? lead.source}
        </p>
        <p>
          <span className="font-medium text-foreground/80">Data:</span> {formatLeadDate(lead.createdAt)}
        </p>
      </CardContent>
    </Card>
  );
}

export function DashboardLeadsPanel({ leads, className }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [page, setPage] = useState(0);

  const sortedLeads = useMemo(
    () => [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [leads],
  );

  const totalPages = Math.max(1, Math.ceil(sortedLeads.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedLeads = sortedLeads.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Planilha de leads</CardTitle>
          <CardDescription>
            {sortedLeads.length.toLocaleString('pt-BR')} leads no período selecionado
          </CardDescription>
        </div>
        <ViewModeToggle
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          tableLabel="Planilha"
          cardsLabel="Cards"
        />
      </CardHeader>
      <CardContent>
        {sortedLeads.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum lead no período.</p>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Origem</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Contato</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-t border-border/50 transition-colors hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-medium">{lead.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.company ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {LEAD_SOURCE_LABELS[lead.source] ?? lead.source}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={LEAD_STATUS_COLORS[lead.status]}>
                        {LEAD_STATUS_LABELS[lead.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.email ?? lead.phone ?? '—'}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {formatLeadDate(lead.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedLeads.map((lead) => (
              <DashboardLeadMiniCard key={lead.id} lead={lead} />
            ))}
          </div>
        )}

        {sortedLeads.length > PAGE_SIZE ? (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              Página {safePage + 1} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-border/60 px-3 py-1.5 transition-colors hover:bg-muted disabled:opacity-40"
                disabled={safePage <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="rounded-lg border border-border/60 px-3 py-1.5 transition-colors hover:bg-muted disabled:opacity-40"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Próxima
              </button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
