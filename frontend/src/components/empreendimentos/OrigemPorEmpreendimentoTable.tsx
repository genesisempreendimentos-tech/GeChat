import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { EmpreendimentoOrigemRow } from '@/lib/empreendimentosMetrics';

type OrigemPorEmpreendimentoTableProps = {
  rows: EmpreendimentoOrigemRow[];
  showDiretoAlert?: boolean;
};

export function OrigemPorEmpreendimentoTable({
  rows,
  showDiretoAlert = false,
}: OrigemPorEmpreendimentoTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Origem por empreendimento</CardTitle>
        <CardDescription>Distribuição dos canais de captação por produto</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {showDiretoAlert ? (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            Grande parte dos leads aparece como Direto. Verifique UTMs e rastreamento das campanhas.
          </div>
        ) : null}
        {!rows.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum lead encontrado para os filtros selecionados.
          </p>
        ) : (
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Empreendimento</th>
                <th className="pb-2 pr-3 text-right font-medium">Direto</th>
                <th className="pb-2 pr-3 text-right font-medium">Meta</th>
                <th className="pb-2 pr-3 text-right font-medium">Google</th>
                <th className="pb-2 pr-3 text-right font-medium">Orgânico</th>
                <th className="pb-2 pr-3 text-right font-medium">WhatsApp</th>
                <th className="pb-2 pr-3 text-right font-medium">Formulário</th>
                <th className="pb-2 pr-3 text-right font-medium">Outros</th>
                <th className="pb-2 text-right font-medium">Sem origem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.empreendimento} className="border-b border-border/40 last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{row.empreendimento}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.direto}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.meta}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.google}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.organico}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.whatsapp}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.formulario}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{row.outros}</td>
                  <td className="py-2.5 text-right tabular-nums">{row.semOrigem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
