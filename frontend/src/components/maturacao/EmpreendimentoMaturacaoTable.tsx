import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { EmpreendimentoMaturacaoRow } from '@/lib/dadosMaturacao';

export function EmpreendimentoMaturacaoTable({ rows }: { rows: EmpreendimentoMaturacaoRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Maturação por empreendimento</CardTitle>
        <CardDescription>Etapa atual e idade dos leads por empreendimento</CardDescription>
      </CardHeader>
      <CardContent>
        {!rows.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sem dados de empreendimento no período selecionado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Empreendimento</th>
                  <th className="pb-2 pr-3 text-right font-medium">Em aberto</th>
                  <th className="pb-2 pr-3 text-right font-medium">31+ dias</th>
                  <th className="pb-2 pr-3 text-right font-medium">61+ dias</th>
                  <th className="pb-2 pr-3 text-right font-medium">Atendimento</th>
                  <th className="pb-2 pr-3 text-right font-medium">Visitas</th>
                  <th className="pb-2 pr-3 text-right font-medium">Crédito</th>
                  <th className="pb-2 text-right font-medium">Vendas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.empreendimento} className="border-b border-border/40 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{row.empreendimento}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.emAberto}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.dias31Plus}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.dias61Plus}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.atendimento}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.visitas}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.credito}</td>
                    <td className="py-2.5 text-right tabular-nums">{row.vendas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
