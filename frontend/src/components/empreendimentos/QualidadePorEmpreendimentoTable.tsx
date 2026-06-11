import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { EmpreendimentoQualidadeRow } from '@/lib/empreendimentosMetrics';

function formatPct(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export function QualidadePorEmpreendimentoTable({ rows }: { rows: EmpreendimentoQualidadeRow[] }) {
  const hasLimitada = rows.some((r) => r.qualidadeLimitada);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Qualidade por empreendimento</CardTitle>
        <CardDescription>
          Distribuição de alta, média, baixa e indefinida por produto
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {hasLimitada ? (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            Muitos leads estão sem qualificação. A comparação entre empreendimentos pode ficar
            limitada.
          </div>
        ) : null}
        {!rows.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum lead encontrado para os filtros selecionados.
          </p>
        ) : (
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Empreendimento</th>
                <th className="pb-2 pr-3 text-right font-medium">Alta</th>
                <th className="pb-2 pr-3 text-right font-medium">Média</th>
                <th className="pb-2 pr-3 text-right font-medium">Baixa</th>
                <th className="pb-2 pr-3 text-right font-medium">Indefinida</th>
                <th className="pb-2 pr-3 text-right font-medium">Tx qualif.</th>
                <th className="pb-2 text-right font-medium">% indefinida</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.empreendimento} className="border-b border-border/40 last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{row.empreendimento}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.alta}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.media}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.baixa}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.indefinida}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{formatPct(row.taxaQualificacao)}</td>
                  <td className="py-2.5 text-right tabular-nums">{formatPct(row.taxaIndefinida)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
