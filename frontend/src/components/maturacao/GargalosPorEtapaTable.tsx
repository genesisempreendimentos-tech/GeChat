import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { GargaloEtapaRow } from '@/lib/dadosMaturacao';

export function GargalosPorEtapaTable({ rows }: { rows: GargaloEtapaRow[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Gargalos por etapa</CardTitle>
        <CardDescription>Leads sem avanço por etapa atual</CardDescription>
      </CardHeader>
      <CardContent>
        {!rows.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum lead parado identificado no período selecionado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[20rem] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Etapa atual</th>
                  <th className="pb-2 pr-4 text-right font-medium">Leads parados</th>
                  <th className="pb-2 text-right font-medium">Tempo médio parado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.etapa} className="border-b border-border/40 last:border-0">
                    <td className="py-2.5 pr-4">{row.etapa}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums font-medium">
                      {row.parados.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {row.tempoMedioParado !== null ? `${row.tempoMedioParado} dias` : '—'}
                    </td>
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
