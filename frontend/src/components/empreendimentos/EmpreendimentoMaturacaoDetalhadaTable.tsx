import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getBaseMaturacaoStatus, type EmpreendimentoMetrics } from '@/lib/empreendimentosMetrics';

function formatPct(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

const BASE_STATUS_CLASS: Record<ReturnType<typeof getBaseMaturacaoStatus>, string> = {
  Saudável: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  Atenção: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  Envelhecida: 'bg-orange-500/15 text-orange-800 dark:text-orange-200',
  Crítica: 'bg-red-500/15 text-red-700 dark:text-red-300',
};

export function EmpreendimentoMaturacaoDetalhadaTable({ rows }: { rows: EmpreendimentoMetrics[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Maturação por empreendimento</CardTitle>
        <CardDescription>Idade da base e leads em aberto por produto</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {!rows.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum lead em aberto no período selecionado.
          </p>
        ) : (
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Empreendimento</th>
                <th className="pb-2 pr-3 text-right font-medium">Em aberto</th>
                <th className="pb-2 pr-3 text-right font-medium">0–7</th>
                <th className="pb-2 pr-3 text-right font-medium">8–15</th>
                <th className="pb-2 pr-3 text-right font-medium">16–30</th>
                <th className="pb-2 pr-3 text-right font-medium">31–60</th>
                <th className="pb-2 pr-3 text-right font-medium">61+</th>
                <th className="pb-2 pr-3 text-right font-medium">% 61+</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const baseStatus = getBaseMaturacaoStatus(row.percentual61Mais);
                return (
                  <tr key={row.empreendimentoId} className="border-b border-border/40 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{row.empreendimentoNome}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.emAberto}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.leads0a7}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.leads8a15}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.leads16a30}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.leads31a60}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.leads61Mais}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{formatPct(row.percentual61Mais)}</td>
                    <td className="py-2.5">
                      <span
                        className={cn(
                          'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                          BASE_STATUS_CLASS[baseStatus],
                        )}
                      >
                        {baseStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
