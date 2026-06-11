import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LeadCriticoRow, MaturationStatus } from '@/lib/dadosMaturacao';

const STATUS_BADGE: Record<MaturationStatus, string> = {
  novo: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  em_maturacao: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  atencao: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  critico: 'bg-red-500/15 text-red-700 dark:text-red-300',
  concluido: 'bg-muted text-muted-foreground',
};

const STATUS_LABEL: Record<MaturationStatus, string> = {
  novo: 'Novo',
  em_maturacao: 'Em maturação',
  atencao: 'Atenção',
  critico: 'Crítico',
  concluido: 'Concluído',
};

type LeadsCriticosTableProps = {
  rows: LeadCriticoRow[];
  totalCount: number;
};

export function LeadsCriticosTable({ rows, totalCount }: LeadsCriticosTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Leads que precisam de atenção</CardTitle>
        <CardDescription>
          Leads antigos, parados ou sem avanço relevante
          {totalCount > rows.length
            ? ` — mostrando ${rows.length} de ${totalCount}`
            : null}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!rows.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum lead crítico encontrado no período selecionado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Nome</th>
                  <th className="pb-2 pr-3 font-medium">Empreendimento</th>
                  <th className="pb-2 pr-3 font-medium">Origem</th>
                  <th className="pb-2 pr-3 font-medium">Entrada</th>
                  <th className="pb-2 pr-3 text-right font-medium">Idade</th>
                  <th className="pb-2 pr-3 font-medium">Etapa</th>
                  <th className="pb-2 pr-3 text-right font-medium">Sem avanço</th>
                  <th className="pb-2 pr-3 font-medium">Responsável</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/40 last:border-0">
                    <td className="max-w-[10rem] truncate py-2.5 pr-3 font-medium" title={row.nome}>
                      {row.nome}
                    </td>
                    <td className="max-w-[9rem] truncate py-2.5 pr-3" title={row.empreendimento}>
                      {row.empreendimento}
                    </td>
                    <td className="py-2.5 pr-3">{row.origem}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      {format(new Date(row.dataEntrada), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.idadeDias}d</td>
                    <td className="py-2.5 pr-3">{row.etapaAtual}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.diasSemAvanco}d</td>
                    <td className="max-w-[8rem] truncate py-2.5 pr-3" title={row.responsavel}>
                      {row.responsavel}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={cn(
                          'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                          STATUS_BADGE[row.statusMaturacao],
                        )}
                      >
                        {STATUS_LABEL[row.statusMaturacao]}
                      </span>
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
