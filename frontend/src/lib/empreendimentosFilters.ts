import { subDays, subMonths, format } from 'date-fns';
import { filterDadosRows } from '@/lib/dadosFilters';
import { getLeadEtapaAtual, type LeadEtapaComercial } from '@/lib/leadStage';
import { resolveEmpreendimentoPagina } from '@/lib/leadEmpreendimento';
import type { LeadRow } from '@/lib/leadRow';
import {
  aggregateEmpreendimentoMetrics,
  EMPREENDIMENTO_STATUS_FILTER_OPTIONS,
  type EmpreendimentoStatus,
} from '@/lib/empreendimentosMetrics';

export type EmpreendimentosPeriodoRapido = '7d' | '30d' | '3m' | '6m' | '12m' | 'custom';

export type EmpreendimentosFilters = {
  dataInicial: string;
  dataFinal: string;
  periodoRapido: EmpreendimentosPeriodoRapido;
  empreendimento: string;
  origem: string;
  etapaAtual: string;
  qualificacao: string;
  statusEmpreendimento: EmpreendimentoStatus | '';
  responsavel: string;
};

export type EmpreendimentosFilterOptions = {
  empreendimentos: string[];
  origens: string[];
  qualificacoes: string[];
  etapas: string[];
  responsaveis: string[];
  statusEmpreendimento: { value: EmpreendimentoStatus; label: string }[];
};

export const EMPREENDIMENTOS_PERIODO_RAPIDO_OPTIONS: {
  value: EmpreendimentosPeriodoRapido;
  label: string;
}[] = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '3m', label: '3 meses' },
  { value: '6m', label: '6 meses' },
  { value: '12m', label: '12 meses' },
  { value: 'custom', label: 'Personalizado' },
];

const ETAPA_LABELS: Record<LeadEtapaComercial, string> = {
  venda: 'Venda',
  proposta: 'Proposta',
  credito: 'Análise de crédito',
  visita: 'Visita',
  atendimento: 'Atendimento',
  capturado: 'Lead capturado',
  perdido: 'Perdido',
  em_aberto: 'Em aberto',
};

function formatDateInput(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function periodoRapidoToRange(rapido: EmpreendimentosPeriodoRapido): {
  from: string;
  to: string;
} {
  const to = new Date();
  let from: Date;
  switch (rapido) {
    case '7d':
      from = subDays(to, 7);
      break;
    case '30d':
      from = subDays(to, 30);
      break;
    case '3m':
      from = subMonths(to, 3);
      break;
    case '6m':
      from = subMonths(to, 6);
      break;
    case '12m':
      from = subMonths(to, 12);
      break;
    default:
      return { from: '', to: '' };
  }
  return { from: formatDateInput(from), to: formatDateInput(to) };
}

export function defaultEmpreendimentosFilters(): EmpreendimentosFilters {
  const { from, to } = periodoRapidoToRange('3m');
  return {
    dataInicial: from,
    dataFinal: to,
    periodoRapido: '3m',
    empreendimento: '',
    origem: '',
    etapaAtual: '',
    qualificacao: '',
    statusEmpreendimento: '',
    responsavel: '',
  };
}

export function collectEmpreendimentosFilterOptions(rows: LeadRow[]): EmpreendimentosFilterOptions {
  const empreendimentos = new Set<string>();
  const origens = new Set<string>();
  const qualificacoes = new Set<string>();
  const etapas = new Set<string>();
  const responsaveis = new Set<string>();

  for (const row of rows) {
    const pagina = resolveEmpreendimentoPagina(row);
    if (pagina) empreendimentos.add(pagina);
    if (row.origem) origens.add(row.origem);
    if (row.qualificacao) qualificacoes.add(row.qualificacao);
    etapas.add(ETAPA_LABELS[getLeadEtapaAtual(row)]);
    const r = row.responsavel?.trim();
    if (r) responsaveis.add(r);
  }

  const sortPt = (a: string, b: string) => a.localeCompare(b, 'pt-BR');

  return {
    empreendimentos: Array.from(empreendimentos).sort(sortPt),
    origens: Array.from(origens).sort(sortPt),
    qualificacoes: Array.from(qualificacoes).sort(sortPt),
    etapas: Array.from(etapas).sort(sortPt),
    responsaveis: Array.from(responsaveis).sort(sortPt),
    statusEmpreendimento: EMPREENDIMENTO_STATUS_FILTER_OPTIONS,
  };
}

export function filterEmpreendimentosRows(
  rows: LeadRow[],
  filtros: EmpreendimentosFilters,
): LeadRow[] {
  return filterDadosRows(rows, {
    dataInicial: filtros.dataInicial,
    dataFinal: filtros.dataFinal,
    empreendimento: filtros.empreendimento,
    origem: filtros.origem,
    dispositivo: '',
    canal: '',
    qualificacao: filtros.qualificacao,
    etapaAtual: filtros.etapaAtual,
  }).filter((row) => {
    if (filtros.responsavel && (row.responsavel ?? '').trim() !== filtros.responsavel) {
      return false;
    }
    return true;
  });
}

export function filterEmpreendimentoMetricsByStatus<T extends { status: EmpreendimentoStatus }>(
  metrics: T[],
  status: EmpreendimentoStatus | '',
): T[] {
  if (!status) return metrics;
  return metrics.filter((m) => m.status === status);
}

export function filterMetricsForEmpreendimentoSelection(
  rows: LeadRow[],
  filtros: EmpreendimentosFilters,
) {
  const filteredRows = filterEmpreendimentosRows(rows, filtros);
  const metrics = aggregateEmpreendimentoMetrics(filteredRows);
  const scopedMetrics = filterEmpreendimentoMetricsByStatus(
    metrics,
    filtros.statusEmpreendimento,
  );
  return { filteredRows, metrics: scopedMetrics };
}
