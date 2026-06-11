import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { EmpreendimentoDesempenhoRow } from '@/lib/dadosMaturacao';

type EmpreendimentoTableProps = {
  rows: EmpreendimentoDesempenhoRow[];
};

export function EmpreendimentoTable({ rows }: EmpreendimentoTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Desempenho por empreendimento</CardTitle>
        <CardDescription>Leads e avanço comercial por produto</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem dados no período</p>
        ) : (
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Empreendimento</th>
                <th className="pb-2 pr-3 text-right font-medium">Leads</th>
                <th className="pb-2 pr-3 text-right font-medium">Qualif.</th>
                <th className="pb-2 pr-3 text-right font-medium">Atend.</th>
                <th className="pb-2 pr-3 text-right font-medium">Visitas</th>
                <th className="pb-2 pr-3 text-right font-medium">Crédito</th>
                <th className="pb-2 pr-3 text-right font-medium">Vendas</th>
                <th className="pb-2 text-right font-medium">Em aberto</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.empreendimento} className="border-b border-border/40 last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-foreground">{row.empreendimento}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.leads.toLocaleString('pt-BR')}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {row.qualificados.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {row.atendimento.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {row.visitas.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {row.credito.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {row.vendas.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {row.emAberto.toLocaleString('pt-BR')}
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
