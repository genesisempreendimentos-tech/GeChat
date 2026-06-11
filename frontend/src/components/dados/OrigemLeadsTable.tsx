import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { OrigemLeadsRow } from '@/lib/dadosMaturacao';

type OrigemLeadsTableProps = {
  rows: OrigemLeadsRow[];
};

export function OrigemLeadsTable({ rows }: OrigemLeadsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Origem dos leads</CardTitle>
        <CardDescription>Leads, qualificados e visitas por origem</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem dados no período</p>
        ) : (
          <table className="w-full min-w-[20rem] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Origem</th>
                <th className="pb-2 pr-4 text-right font-medium">Leads</th>
                <th className="pb-2 pr-4 text-right font-medium">Qualificados</th>
                <th className="pb-2 text-right font-medium">Visitas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.origem} className="border-b border-border/40 last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-foreground">{row.origem}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{row.leads.toLocaleString('pt-BR')}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {row.qualificados.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{row.visitas.toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
