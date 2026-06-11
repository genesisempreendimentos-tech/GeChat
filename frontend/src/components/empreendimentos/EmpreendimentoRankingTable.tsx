import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  EMPREENDIMENTO_STATUS_LABELS,
  type EmpreendimentoMetrics,
  type EmpreendimentoStatus,
} from '@/lib/empreendimentosMetrics';

const STATUS_BADGE: Record<EmpreendimentoStatus, string> = {
  BOM_DESEMPENHO: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  BOM_VOLUME: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  ALTA_QUALIDADE: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  BAIXO_AVANCO: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  SEM_AVANCO_COMERCIAL: 'bg-orange-500/15 text-orange-800 dark:text-orange-200',
  BASE_ENVELHECIDA: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  CRITICO: 'bg-red-500/15 text-red-700 dark:text-red-300',
  POUCOS_DADOS: 'bg-muted text-muted-foreground',
  EM_ANALISE: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
};

function formatPct(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export function EmpreendimentoRankingTable({ rows }: { rows: EmpreendimentoMetrics[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ranking de empreendimentos</CardTitle>
        <CardDescription>Leads, qualidade e avanço comercial por produto</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {!rows.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum lead encontrado para os filtros selecionados.
          </p>
        ) : (
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Empreendimento</th>
                <th className="pb-2 pr-3 text-right font-medium">Leads</th>
                <th className="pb-2 pr-3 text-right font-medium">% Total</th>
                <th className="pb-2 pr-3 text-right font-medium">Qualif.</th>
                <th className="pb-2 pr-3 text-right font-medium">Tx Qualif.</th>
                <th className="pb-2 pr-3 text-right font-medium">Atend.</th>
                <th className="pb-2 pr-3 text-right font-medium">Visitas</th>
                <th className="pb-2 pr-3 text-right font-medium">Crédito</th>
                <th className="pb-2 pr-3 text-right font-medium">Vendas</th>
                <th className="pb-2 pr-3 text-right font-medium">Em aberto</th>
                <th className="pb-2 pr-3 text-right font-medium">61+ dias</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.empreendimentoId} className="border-b border-border/40 last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{row.empreendimentoNome}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.leads}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{formatPct(row.percentualDoTotal)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.qualificados}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{formatPct(row.taxaQualificacao)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.atendimento}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.visitas}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.credito}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.vendas}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.emAberto}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.leads61Mais}</td>
                  <td className="py-2.5">
                    <span
                      className={cn(
                        'inline-flex rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                        STATUS_BADGE[row.status],
                      )}
                    >
                      {EMPREENDIMENTO_STATUS_LABELS[row.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
