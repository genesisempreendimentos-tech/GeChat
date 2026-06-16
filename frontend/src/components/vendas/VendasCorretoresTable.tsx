import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import type { VendasCorretorRanking } from '@/types/vendas';
import { formatVendasBRL, formatVendasCount } from '@/lib/vendasFormat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type SortKey = 'valor' | 'vendas';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

type VendasCorretoresTableProps = {
  rows: VendasCorretorRanking[];
  loading?: boolean;
};

function SortButton({
  label,
  active,
  dir,
  onClick,
  align = 'left',
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: 'left' | 'right';
}) {
  const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 font-medium transition-colors hover:text-foreground',
        align === 'right' && 'ml-auto',
        active ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {label}
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
    </button>
  );
}

export function VendasCorretoresTable({ rows, loading }: VendasCorretoresTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('valor');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (q) {
      list = rows.filter((row) => {
        const nome = (row.nome ?? '').toLowerCase();
        const imob = (row.imobiliaria ?? '').toLowerCase();
        return nome.includes(q) || imob.includes(q) || row.idcorretor.includes(q);
      });
    }
    return [...list].sort((a, b) => {
      const av = sortKey === 'valor' ? a.valor_vendas : a.vendas;
      const bv = sortKey === 'valor' ? b.valor_vendas : b.vendas;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [rows, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(0);
  };

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle className="text-base">Ranking de corretores</CardTitle>
          <CardDescription>
            Todos os corretores da carteira — ordenável por valor ou volume de vendas.
          </CardDescription>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar corretor..."
            className="h-9 rounded-xl pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !filtered.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhum corretor encontrado para esta busca.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">#</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Corretor</th>
                    <th className="pb-2 pr-3 text-right font-medium text-muted-foreground">Leads</th>
                    <th className="pb-2 pr-3 text-right">
                      <SortButton
                        label="Vendas"
                        active={sortKey === 'vendas'}
                        dir={sortDir}
                        onClick={() => toggleSort('vendas')}
                        align="right"
                      />
                    </th>
                    <th className="pb-2 pr-3 text-right">
                      <SortButton
                        label="Valor"
                        active={sortKey === 'valor'}
                        dir={sortDir}
                        onClick={() => toggleSort('valor')}
                        align="right"
                      />
                    </th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">Ticket médio</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, index) => {
                    const position = safePage * PAGE_SIZE + index + 1;
                    const isFirst = position === 1;
                    return (
                      <tr key={row.idcorretor} className="border-b border-border/40 last:border-0">
                        <td className="py-3 pr-3 tabular-nums">
                          <span
                            className={cn(
                              'inline-flex min-w-[1.75rem] justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold',
                              isFirst
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {position}
                          </span>
                        </td>
                        <td className="max-w-[14rem] py-3 pr-3">
                          <p className="truncate font-medium" title={row.nome ?? row.idcorretor}>
                            {row.nome ?? `Corretor ${row.idcorretor}`}
                          </p>
                          {row.imobiliaria ? (
                            <p className="truncate text-xs text-muted-foreground" title={row.imobiliaria}>
                              {row.imobiliaria}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatVendasCount(row.leads)}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatVendasCount(row.vendas)}</td>
                        <td className="py-3 pr-3 text-right font-semibold tabular-nums text-primary">
                          {formatVendasBRL(row.valor_vendas)}
                        </td>
                        <td className="py-3 text-right tabular-nums text-muted-foreground">
                          {row.ticket_medio != null ? formatVendasBRL(row.ticket_medio) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {formatVendasCount(filtered.length)} corretores · página {safePage + 1} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    disabled={safePage <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    disabled={safePage >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
