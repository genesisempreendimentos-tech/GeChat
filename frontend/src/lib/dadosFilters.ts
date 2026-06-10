import { endOfDay, startOfDay } from 'date-fns';
import { filterRowsByBalancoRange, getLeadsBalancoRanges } from '@/lib/leadsBalanco';
import {
  defaultLeadsPageControlFilters,
  type LeadsBalancoMode,
  type LeadMetricaFiltro,
  type LeadsPageControlFilters,
} from '@/lib/leadsControlLine';
import {
  computeLeadsInfoboxStats,
  filterLeadsByMetrica,
  type LeadMetricsRow,
} from '@/lib/leadsMetrics';
import type { LeadsBalanceComparison } from '@/components/charts/Balance';

export type DadosFilters = LeadsPageControlFilters & {
  dataInicial: string;
  dataFinal: string;
  /** Vazio = todos; mapeado via `pagina` no mock. */
  empreendimento: string;
  origem: string;
  dispositivo: string;
};

export type DadosFilterOptions = {
  empreendimentos: string[];
  origens: string[];
  dispositivos: string[];
};

export const DADOS_BALANCO_OPTIONS: { value: LeadsBalancoMode; label: string }[] = [
  { value: 'desligado', label: 'Sem comparação' },
  { value: 'mes_anterior', label: 'Vs. mês anterior' },
  { value: 'semana_anterior', label: 'Vs. semana anterior' },
];

export function defaultDadosFilters(): DadosFilters {
  return {
    ...defaultLeadsPageControlFilters(),
    dataInicial: '',
    dataFinal: '',
    empreendimento: '',
    origem: '',
    dispositivo: '',
  };
}

function parseFilterDate(value: string, endOfDayFlag: boolean): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    return endOfDayFlag ? endOfDay(d).getTime() : startOfDay(d).getTime();
  }

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (Number.isNaN(d.getTime())) return null;
    return endOfDayFlag ? endOfDay(d).getTime() : startOfDay(d).getTime();
  }

  const parsed = new Date(trimmed).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

export function collectDadosFilterOptions(rows: LeadMetricsRow[]): DadosFilterOptions {
  const empreendimentos = new Set<string>();
  const origens = new Set<string>();
  const dispositivos = new Set<string>();

  for (const row of rows) {
    if (row.pagina) empreendimentos.add(row.pagina);
    if (row.origem) origens.add(row.origem);
    const device = row.dispositivo?.trim();
    if (device) dispositivos.add(device);
  }

  const sortPt = (a: string, b: string) => a.localeCompare(b, 'pt-BR');

  return {
    empreendimentos: Array.from(empreendimentos).sort(sortPt),
    origens: Array.from(origens).sort(sortPt),
    dispositivos: Array.from(dispositivos).sort(sortPt),
  };
}

export function filterDadosRows<T extends LeadMetricsRow>(
  rows: T[],
  filtros: Pick<DadosFilters, 'dataInicial' | 'dataFinal' | 'empreendimento' | 'origem' | 'dispositivo'>,
): T[] {
  const startMs = parseFilterDate(filtros.dataInicial, false);
  const endMs = parseFilterDate(filtros.dataFinal, true);

  return rows.filter((row) => {
    if (startMs !== null || endMs !== null) {
      const t = new Date(row.dataHora).getTime();
      if (Number.isNaN(t)) return false;
      if (startMs !== null && t < startMs) return false;
      if (endMs !== null && t > endMs) return false;
    }
    if (filtros.empreendimento && row.pagina !== filtros.empreendimento) return false;
    if (filtros.origem && row.origem !== filtros.origem) return false;
    if (filtros.dispositivo && (row.dispositivo ?? '') !== filtros.dispositivo) return false;
    return true;
  });
}

export function applyDadosPipeline<T extends LeadMetricsRow>(
  rows: T[],
  filtros: DadosFilters,
): T[] {
  const scoped = filterDadosRows(rows, filtros);
  const ranges = getLeadsBalancoRanges(filtros.balanco);
  const balancoScoped = ranges
    ? filterRowsByBalancoRange(scoped, ranges.current, (row) => row.dataHora)
    : scoped;
  return filterLeadsByMetrica(balancoScoped, filtros.metrica);
}

export function computeDadosBalanceCtx(
  filtros: DadosFilters,
  rows: LeadMetricsRow[],
) {
  const { balanco, metrica } = filtros;
  if (balanco === 'desligado') return null;
  const ranges = getLeadsBalancoRanges(balanco);
  if (!ranges) return null;

  const base = filterDadosRows(rows, filtros);
  const comparison: LeadsBalanceComparison = { mode: balanco, current: ranges.current, previous: ranges.previous };
  const c = filterRowsByBalancoRange(base, ranges.current, (r) => r.dataHora);
  const p = filterRowsByBalancoRange(base, ranges.previous, (r) => r.dataHora);
  const cFiltered = filterLeadsByMetrica(c, metrica);
  const pFiltered = filterLeadsByMetrica(p, metrica);
  const statsC = computeLeadsInfoboxStats(cFiltered);
  const statsP = computeLeadsInfoboxStats(pFiltered);

  return {
    comparison,
    deltas: {
      leads: statsC.leads - statsP.leads,
      forms: statsC.forms - statsP.forms,
      whatsapp: statsC.whatsapp - statsP.whatsapp,
      taxaConversaoPct: Math.round(statsC.taxaConversaoPct - statsP.taxaConversaoPct),
      vendas: statsC.vendas - statsP.vendas,
      atendimentoCorretor: statsC.atendimentoCorretor - statsP.atendimentoCorretor,
      visitasAgendadas: statsC.visitasAgendadas - statsP.visitasAgendadas,
      analiseCredito: statsC.analiseCredito - statsP.analiseCredito,
    },
  };
}