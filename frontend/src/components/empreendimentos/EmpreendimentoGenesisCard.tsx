import { MoreVertical, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmpreendimentoGenesisLogo } from '@/components/empreendimentos/EmpreendimentoGenesisLogo';
import { DEFAULT_EMPREENDIMENTO_COLOR, empreendimentoColorHex } from '@/lib/brandColors';
import { cn } from '@/lib/utils';
import type { EmpreendimentoGenesis } from '@/types/empreendimentos';
type EmpreendimentoGenesisCardProps = {
  item: EmpreendimentoGenesis;
  isAdmin?: boolean;
  onEdit?: (item: EmpreendimentoGenesis) => void;
};

export function formatEmpreendimentoPct(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export function formatEmpreendimentoCount(value: number): string {
  return value.toLocaleString('pt-BR');
}

export function EmpreendimentoAliasesBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex rounded-md bg-slate-500/15 px-2 py-0.5 text-xs font-medium tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-300">
      {formatEmpreendimentoCount(count)} {count === 1 ? 'alias' : 'aliases'}
    </span>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export function EmpreendimentoGenesisCard({
  item,
  isAdmin = false,
  onEdit,
}: EmpreendimentoGenesisCardProps) {
  const taxaQualificacao = item.taxa_qualificacao ?? 0;
  const percentualDoTotal = item.percentual_do_total ?? 0;

  return (
    <Card className="h-full transition-all duration-200 hover:border-primary/40 hover:shadow-md">
      <div className="flex h-full flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <EmpreendimentoGenesisLogo item={item} />
            <div className="min-w-0 space-y-2">
              <p className="truncate font-semibold text-foreground" title={item.nome}>
                {item.nome}
              </p>
              <div className="flex w-full flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                    item.ativo
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
                  )}
                >
                  {item.ativo ? 'Ativo' : 'Inativo'}
                </span>
                <EmpreendimentoAliasesBadge count={item.aliases_count} />
                <span
                  className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border/70"
                  style={{
                    backgroundColor: empreendimentoColorHex(
                      item.cor ?? DEFAULT_EMPREENDIMENTO_COLOR,
                    ),
                  }}
                  title={`Cor: ${item.nome}`}
                  aria-hidden
                />
              </div>
            </div>
          </div>
          {isAdmin && onEdit ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        <div className="mt-auto grid grid-cols-3 gap-x-3 gap-y-4 border-t border-border/50 pt-3 text-sm">
          <MetricCell
            label="Pessoas"
            value={formatEmpreendimentoCount(item.pessoas_unicas_count ?? item.leads_count)}
          />
          <MetricCell label="Do total" value={formatEmpreendimentoPct(percentualDoTotal)} />
          <MetricCell label="Qualificados" value={formatEmpreendimentoPct(taxaQualificacao)} />
          <MetricCell label="Reservas" value={formatEmpreendimentoCount(item.reservas_count ?? 0)} />
          <MetricCell label="Andamento" value={formatEmpreendimentoCount(item.v_andamento_count ?? 0)} />
          <MetricCell label="Vendas" value={formatEmpreendimentoCount(item.vendas_count ?? 0)} />
        </div>
      </div>
    </Card>
  );
}
