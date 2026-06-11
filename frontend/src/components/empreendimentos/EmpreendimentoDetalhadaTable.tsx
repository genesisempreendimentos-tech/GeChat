import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  EMPREENDIMENTO_STATUS_LABELS,
  type EmpreendimentoMetrics,
  type EmpreendimentoStatus,
} from '@/lib/empreendimentosMetrics';

const STATUS_BADGE: Record<EmpreendimentoStatus, string> = {
  BOM_DESEMPENHO: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  BOM_VOLUME: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  ALTA_QUALIDADE: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  BAIXO_AVANCO: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  SEM_AVANCO_COMERCIAL: 'bg-orange-500/15 text-orange-800 dark:text-orange-200',
  BASE_ENVELHECIDA: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  CRITICO: 'bg-red-500/15 text-red-700 dark:text-red-300',
  POUCOS_DADOS: 'bg-muted text-muted-foreground',
  EM_ANALISE: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
};

type SortKey = keyof EmpreendimentoMetrics | 'empreendimentoNome';

function formatPct(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export function EmpreendimentoDetalhadaTable({ rows }: { rows: EmpreendimentoMetrics[] }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('leads');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q
      ? rows.filter((r) => r.empreendimentoNome.toLowerCase().includes(q))
      : [...rows];

    list.sort((a, b) => {
      const av = a[sortKey as keyof EmpreendimentoMetrics];
      const bv = b[sortKey as keyof EmpreendimentoMetrics];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortAsc ? av.localeCompare(bv, 'pt-BR') : bv.localeCompare(av, 'pt-BR');
      }
      const na = Number(av ?? 0);
      const nb = Number(bv ?? 0);
      return sortAsc ? na - nb : nb - na;
    });

    return list;
  }, [rows, search, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const SortHeader = ({
    label,
    field,
    align = 'left',
  }: {
    label: string;
    field: SortKey;
    align?: 'left' | 'right';
  }) => (
    <th
      className={cn(
        'cursor-pointer pb-2 pr-3 font-medium select-none hover:text-foreground',
        align === 'right' ? 'text-right' : 'text-left',
        sortKey === field && 'text-foreground',
      )}
      onClick={() => handleSort(field)}
    >
      {label}
      {sortKey === field ? (sortAsc ? ' ↑' : ' ↓') : null}
    </th>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lista detalhada de empreendimentos</CardTitle>
        <CardDescription>Métricas completas com busca e ordenação</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empreendimento..."
            className="rounded-xl pl-9"
          />
        </div>
        {!filtered.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum empreendimento encontrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[72rem] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs text-muted-foreground">
                  <SortHeader label="Empreendimento" field="empreendimentoNome" />
                  <SortHeader label="Leads" field="leads" align="right" />
                  <SortHeader label="% total" field="percentualDoTotal" align="right" />
                  <SortHeader label="Qualif." field="qualificados" align="right" />
                  <SortHeader label="Tx qualif." field="taxaQualificacao" align="right" />
                  <SortHeader label="Atend." field="atendimento" align="right" />
                  <SortHeader label="Visitas" field="visitas" align="right" />
                  <SortHeader label="Crédito" field="credito" align="right" />
                  <SortHeader label="Vendas" field="vendas" align="right" />
                  <SortHeader label="Lead→venda" field="taxaVendaSobreLeads" align="right" />
                  <SortHeader label="Em aberto" field="emAberto" align="right" />
                  <SortHeader label="61+ dias" field="leads61Mais" align="right" />
                  <SortHeader label="% 61+" field="percentual61Mais" align="right" />
                  <th className="pb-2 pr-3 text-left font-medium">Gargalo</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.empreendimentoId} className="border-b border-border/40 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{row.empreendimentoNome}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.leads}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{formatPct(row.percentualDoTotal)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.qualificados}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{formatPct(row.taxaQualificacao)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.atendimento}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.visitas}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.credito}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.vendas}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{formatPct(row.taxaVendaSobreLeads)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.emAberto}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.leads61Mais}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{formatPct(row.percentual61Mais)}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{row.principalGargalo}</td>
                    <td className="py-2.5">
                      <span
                        className={cn(
                          'inline-flex rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                          STATUS_BADGE[row.status],
                        )}
                      >
                        {EMPREENDIMENTO_STATUS_LABELS[row.status]}
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
