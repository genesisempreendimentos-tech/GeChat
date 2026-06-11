import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { EmpreendimentoGargaloRow } from '@/lib/empreendimentosMetrics';

export function GargalosPorEmpreendimentoTable({ rows }: { rows: EmpreendimentoGargaloRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Gargalos por empreendimento</CardTitle>
        <CardDescription>Etapa com maior perda ou concentração de leads</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {!rows.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum gargalo crítico identificado no período selecionado.
          </p>
        ) : (
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Empreendimento</th>
                <th className="pb-2 pr-3 font-medium">Principal gargalo</th>
                <th className="pb-2 font-medium">Evidência</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.empreendimento} className="border-b border-border/40 last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{row.empreendimento}</td>
                  <td className="py-2.5 pr-3">{row.principalGargalo}</td>
                  <td className="py-2.5 text-muted-foreground">{row.evidencia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
