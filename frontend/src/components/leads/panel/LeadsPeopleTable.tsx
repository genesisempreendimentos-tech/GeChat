import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, FileText, MonitorCog, RefreshCw, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TabButtons, type TabButtonItem } from '@/components/ui/tab-buttons';
import { ViewModeToggle, type ViewMode } from '@/components/ui/ViewModeToggle';
import { LeadCard, type LeadCardRow } from '@/components/leads/LeadCard';
import { LeadDisplayIdBadge } from '@/components/leads/LeadDisplayIdBadge';
import { LeadParametroCell } from '@/components/leads/LeadParametroCell';
import {
  dash,
  formatBirthDatePtBr,
  LeadCanalBucketCell,
  LeadCvcrmCell,
  LeadObservacoesCell,
  LeadQualificacaoIrisCell,
} from '@/components/leads/panel/leadsPanelTableCells';
import { MotionFlipNumber } from '@/components/motion/AppMotion';
import { formatLeadDateCreated } from '@/lib/formatDateTime';
import { parseGeleadsIdSeq } from '@/lib/leadDisplayId';
import type { LeadsListRow } from '@/types/leadsList';
import { cn } from '@/lib/utils';

type LeadsTableTab = 'detalhes' | 'perfil' | 'cvCrm';

type LeadsPanelSortKey =
  | 'id_amigavel'
  | 'nome'
  | 'email'
  | 'telefone'
  | 'empreendimento_interesse'
  | 'canal_bucket'
  | 'parameter'
  | 'cvcrm'
  | 'status_qualificacao'
  | 'created_at'
  | 'relacionamento'
  | 'investimento'
  | 'cidade'
  | 'birth_date'
  | 'perfil_tipo'
  | 'responsavel'
  | 'canal_raw'
  | 'observacoes';

const LEADS_TAB_BUTTON_ITEMS: ReadonlyArray<TabButtonItem<LeadsTableTab>> = [
  { value: 'detalhes', label: 'Detalhes', Icon: FileText },
  { value: 'perfil', label: 'Perfil', Icon: User },
  { value: 'cvCrm', label: 'CV-CRM', Icon: MonitorCog },
];

const LEADS_PANEL_COL_DETALHES: { key: LeadsPanelSortKey; label: string }[] = [
  { key: 'id_amigavel', label: 'ID' },
  { key: 'nome', label: 'Nome' },
  { key: 'email', label: 'E-mail' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'empreendimento_interesse', label: 'Empreendimento Interesse' },
  { key: 'canal_bucket', label: 'Canal' },
  { key: 'parameter', label: 'Parâmetro' },
  { key: 'cvcrm', label: 'CVCRM' },
  { key: 'status_qualificacao', label: 'Status' },
  { key: 'created_at', label: 'Criado em' },
];

const LEADS_PANEL_COL_PERFIL: { key: LeadsPanelSortKey; label: string }[] = [
  { key: 'id_amigavel', label: 'ID' },
  { key: 'nome', label: 'Nome' },
  { key: 'email', label: 'E-mail' },
  { key: 'relacionamento', label: 'Relacionamento' },
  { key: 'investimento', label: 'Investimento' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'birth_date', label: 'Idade' },
  { key: 'perfil_tipo', label: 'Perfil' },
];

const LEADS_PANEL_COL_CVCRM: { key: LeadsPanelSortKey; label: string }[] = [
  { key: 'id_amigavel', label: 'ID' },
  { key: 'nome', label: 'Nome' },
  { key: 'responsavel', label: 'Responsável' },
  { key: 'canal_bucket', label: 'Canal' },
  { key: 'canal_raw', label: 'Origem' },
  { key: 'observacoes', label: 'Observações' },
  { key: 'status_qualificacao', label: 'Status' },
  { key: 'created_at', label: 'Criado em' },
];

type LeadsPeopleTableProps = {
  rows: LeadsListRow[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  refreshing?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onRefresh?: () => void;
};

function renderPanelCell(row: LeadsListRow, key: LeadsPanelSortKey): ReactNode {
  switch (key) {
    case 'id_amigavel':
      return <LeadDisplayIdBadge geleadsId={row.geleads_id} codigo={row.codigo} />;
    case 'nome':
      return row.nome;
    case 'email':
      return <span className="text-muted-foreground">{dash(row.email)}</span>;
    case 'telefone':
      return <span className="text-muted-foreground">{dash(row.telefone)}</span>;
    case 'empreendimento_interesse':
      return dash(row.empreendimento_interesse);
    case 'canal_bucket':
      return <LeadCanalBucketCell bucket={row.canal_bucket} />;
    case 'parameter':
      return row.parameter ? <LeadParametroCell value={row.parameter} /> : <span className="text-muted-foreground">—</span>;
    case 'cvcrm':
      return <LeadCvcrmCell cvcrmLeadId={row.cvcrm_lead_id} />;
    case 'status_qualificacao':
      return <LeadQualificacaoIrisCell value={row.status_qualificacao} />;
    case 'created_at':
      return (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatLeadDateCreated(row.created_at)}
        </span>
      );
    case 'relacionamento':
      return dash(row.relacionamento);
    case 'investimento':
      return dash(row.investimento);
    case 'cidade':
      return dash(row.cidade);
    case 'birth_date':
      return <span className="text-muted-foreground">{formatBirthDatePtBr(row.birth_date)}</span>;
    case 'perfil_tipo':
      return dash(row.perfil_tipo);
    case 'responsavel':
      return dash(row.responsavel);
    case 'canal_raw':
      return row.canal_raw;
    case 'observacoes':
      return <LeadObservacoesCell value={row.observacoes} />;
    default:
      return null;
  }
}

function sortValue(row: LeadsListRow, key: LeadsPanelSortKey): string | number {
  switch (key) {
    case 'id_amigavel':
      return parseGeleadsIdSeq(row.geleads_id) ?? row.geleads_id ?? '';
    case 'created_at':
      return new Date(row.created_at).getTime() || 0;
    case 'cvcrm':
      return row.cvcrm_lead_id ? 1 : 0;
    case 'birth_date':
      return row.birth_date ?? '';
    case 'status_qualificacao': {
      const order = { 'N/A': 0, Indefinida: 1, Baixa: 2, Média: 3, Alta: 4 };
      return order[row.status_qualificacao] ?? 0;
    }
    default: {
      const raw = row[key as keyof LeadsListRow];
      return String(raw ?? '').toLowerCase();
    }
  }
}

function toLeadCardRow(row: LeadsListRow): LeadCardRow {
  return {
    id: row.person_id,
    codigo: row.geleads_id ?? row.codigo,
    dataHora: row.created_at,
    nome: row.nome,
    pagina: '',
    origem: row.canal_raw,
    canal: row.canal_bucket,
    parametro: row.parameter ?? '',
    qualificacao: row.status_qualificacao,
    email: row.email ?? '',
    telefone: row.telefone ?? '',
    relacionamento: row.relacionamento ?? '',
    investimento: row.investimento ?? '',
    perfilLead: row.perfil_tipo ?? '',
    empreendimento: row.empreendimento_interesse ?? '',
    responsavel: row.responsavel ?? '',
    perfilOutrasRespostas: row.observacoes ?? '',
  };
}

export function LeadsPeopleTable({
  rows,
  total,
  page,
  pageSize,
  loading,
  refreshing,
  search,
  onSearchChange,
  onPageChange,
  onRefresh,
}: LeadsPeopleTableProps) {
  const [tableTab, setTableTab] = useState<LeadsTableTab>('detalhes');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortKey, setSortKey] = useState<LeadsPanelSortKey>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns = useMemo(() => {
    if (tableTab === 'perfil') return LEADS_PANEL_COL_PERFIL;
    if (tableTab === 'cvCrm') return LEADS_PANEL_COL_CVCRM;
    return LEADS_PANEL_COL_DETALHES;
  }, [tableTab]);

  useEffect(() => {
    if (tableTab === 'detalhes' || tableTab === 'cvCrm') {
      setSortKey('created_at');
      setSortDirection('desc');
    } else {
      setSortKey('nome');
      setSortDirection('asc');
    }
  }, [tableTab]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av < bv) return sortDirection === 'asc' ? -1 : 1;
      if (av > bv) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortKey, sortDirection]);

  const handleSort = (key: LeadsPanelSortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  };

  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="text-base">Leads</CardTitle>
        <p className="text-sm text-muted-foreground">
          {loading ? 'Carregando…' : `${total.toLocaleString('pt-BR')} lead(s) no filtro`}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-3 sm:gap-5">
          <div className="flex flex-wrap items-center gap-3 sm:justify-self-start">
            <TabButtons value={tableTab} onChange={setTableTab} items={LEADS_TAB_BUTTON_ITEMS} />
          </div>
          <div className="w-full sm:max-w-md sm:justify-self-center">
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Busca por ID, nome, telefone, e-mail..."
              className="h-10 rounded-xl"
            />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 sm:justify-self-end">
            <ViewModeToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              tableLabel="Planilha"
              cardsLabel="Cards"
            />
            <div className="inline-flex items-center gap-1 rounded-full border border-input bg-background/50 p-1 shadow-sm">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                disabled={page <= 1 || loading}
                onClick={() => onPageChange(page - 1)}
              >
                {'<'}
              </Button>
              <span className="inline-flex h-8 min-w-[4rem] items-center justify-center rounded-full px-3 text-sm font-medium leading-none text-muted-foreground">
                <MotionFlipNumber value={`${page}/${totalPages}`} />
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                disabled={page >= totalPages || loading}
                onClick={() => onPageChange(page + 1)}
              >
                {'>'}
              </Button>
            </div>
            {onRefresh ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                disabled={loading || refreshing}
                onClick={onRefresh}
                aria-label="Recarregar leads"
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              </Button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-[320px] w-full rounded-xl" />
        ) : (
          <AnimatePresence mode="wait">
            {viewMode === 'table' ? (
              <motion.div
                key={`table-${tableTab}`}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden rounded-xl border border-border bg-muted/40 dark:bg-card"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                        {columns.map((col) => {
                          const isActive = sortKey === col.key;
                          const SortIcon = sortDirection === 'asc' ? ArrowUp : ArrowDown;
                          return (
                            <th key={col.key} className="whitespace-nowrap px-4 py-3.5 font-medium">
                              <button
                                type="button"
                                onClick={() => handleSort(col.key)}
                                className="inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-foreground"
                              >
                                <span>{col.label}</span>
                                {isActive ? <SortIcon className="h-3.5 w-3.5 text-foreground" /> : null}
                              </button>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRows.map((row) => (
                        <tr key={row.person_id || row.id_amigavel} className="border-b border-border/60 hover:bg-muted/20">
                          {columns.map((col) => (
                            <td key={col.key} className="px-4 py-3.5 align-top">
                              {renderPanelCell(row, col.key)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!sortedRows.length ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum lead encontrado com os filtros atuais.
                  </p>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key={`cards-${tableTab}`}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {sortedRows.map((row, index) => (
                    <motion.div
                      key={row.person_id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04, duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                      className="h-full"
                    >
                      <LeadCard row={toLeadCardRow(row)} tab={tableTab} />
                    </motion.div>
                  ))}
                </div>
                {!sortedRows.length ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum lead encontrado com os filtros atuais.
                  </p>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}
