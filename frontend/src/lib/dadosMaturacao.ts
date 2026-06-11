import { differenceInDays, format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  getLeadEtapaAtual,
  isAnaliseCreditoStage,
  isAtendimentoCorretor,
  isLeadEmAberto,
  isVisitaAgendada,
  rowHasStageDates,
} from '@/lib/leadStage';
import { computeLeadsInfoboxStats, type LeadMetricsRow } from '@/lib/leadsMetrics';
import type { LeadRow } from '@/lib/leadRow';
import { leadRespondeuFormularioPerfil } from '@/rules/qualifyLead';
import { resolveEmpreendimentoLabel } from '@/lib/leadEmpreendimento';

export type SafraMaturacaoRow = {
  safra: string;
  safraKey: string;
  leads: number;
  atendimento: number;
  visita: number;
  credito: number;
  venda: number;
  perdido: number;
  emAberto: number;
};

export type TempoMedioItem = {
  label: string;
  dias: number | null;
};

export type IdadeFaixaItem = {
  faixa: string;
  count: number;
};

export type CreditoSituacao = {
  emAnalise: number;
  tempoMedioDias: number | null;
  dentroDoPrazo: number;
  emAcompanhamento: number;
  acimaDoPrazo: number;
  maiorTempoDias: number | null;
  aprovados: number;
  reprovados: number;
  vendasAposCredito: number;
};

export type MaturationStatus = 'novo' | 'em_maturacao' | 'atencao' | 'critico' | 'concluido';

export type MaturacaoResumoTrend = 'up' | 'down' | 'flat' | 'none';

export type MaturacaoResumoMetric = {
  count: number;
  pct: number;
  trend: MaturacaoResumoTrend;
};

export type MaturacaoResumoCards = {
  leads: MaturacaoResumoMetric;
  visitas: MaturacaoResumoMetric;
  atendimento: MaturacaoResumoMetric;
  vendas: MaturacaoResumoMetric;
};

export type GargaloEtapaRow = {
  etapa: string;
  parados: number;
  tempoMedioParado: number | null;
};

export type EmpreendimentoMaturacaoRow = {
  empreendimento: string;
  emAberto: number;
  dias31Plus: number;
  dias61Plus: number;
  atendimento: number;
  visitas: number;
  credito: number;
  vendas: number;
};

export type LeadCriticoRow = {
  id: string;
  nome: string;
  empreendimento: string;
  origem: string;
  dataEntrada: string;
  idadeDias: number;
  etapaAtual: string;
  diasSemAvanco: number;
  responsavel: string;
  statusMaturacao: MaturationStatus;
  prioridade: number;
};

const ETAPA_STACK_COLORS: Record<string, string> = {
  atendimento: '#3b82f6',
  visita: '#8b5cf6',
  credito: '#64748b',
  venda: '#10b981',
  perdido: '#ef4444',
  emAberto: '#94a3b8',
};

export const SAFRA_STACK_KEYS = [
  'atendimento',
  'visita',
  'credito',
  'venda',
  'perdido',
  'emAberto',
] as const;

export function getLeadSafra(row: LeadMetricsRow): { key: string; label: string } {
  const d = new Date(row.dataHora);
  const monthStart = startOfMonth(d);
  const key = format(monthStart, 'yyyy-MM');
  const label = format(monthStart, 'MMM/yyyy', { locale: ptBR });
  return { key, label: label.charAt(0).toUpperCase() + label.slice(1) };
}

type SafraEtapaField = 'atendimento' | 'visita' | 'credito' | 'venda' | 'perdido' | 'emAberto';

function classifySafraEtapa(row: LeadMetricsRow): SafraEtapaField {
  const etapa = getLeadEtapaAtual(row);
  switch (etapa) {
    case 'atendimento':
      return 'atendimento';
    case 'visita':
      return 'visita';
    case 'credito':
    case 'proposta':
      return 'credito';
    case 'venda':
      return 'venda';
    case 'perdido':
      return 'perdido';
    default:
      return 'emAberto';
  }
}

export function aggregateSafraMaturacao(rows: LeadMetricsRow[]): SafraMaturacaoRow[] {
  const bySafra = new Map<string, SafraMaturacaoRow>();

  for (const row of rows) {
    const { key, label } = getLeadSafra(row);
    const bucket =
      bySafra.get(key) ??
      ({
        safra: label,
        safraKey: key,
        leads: 0,
        atendimento: 0,
        visita: 0,
        credito: 0,
        venda: 0,
        perdido: 0,
        emAberto: 0,
      } satisfies SafraMaturacaoRow);

    bucket.leads += 1;
    const field = classifySafraEtapa(row);
    bucket[field] += 1;
    bySafra.set(key, bucket);
  }

  return Array.from(bySafra.values()).sort((a, b) => a.safraKey.localeCompare(b.safraKey));
}

function avgDaysBetween(startIso: string | null | undefined, endIso: string | null | undefined): number | null {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return differenceInDays(end, start);
}

function averageDays(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

const STAGE_DATE_KEYS: (keyof LeadMetricsRow)[] = [
  'dataPrimeiroAtendimento',
  'dataVisitaAgendada',
  'dataVisitaRealizada',
  'dataAnaliseCreditoInicio',
  'dataAnaliseCreditoFim',
  'dataProposta',
  'dataVenda',
  'dataPerdido',
];

export function getDataUltimaMudancaEtapa(row: LeadMetricsRow): Date {
  let latest = new Date(row.dataHora).getTime();
  for (const key of STAGE_DATE_KEYS) {
    const val = row[key];
    if (typeof val === 'string' && val.trim()) {
      const t = new Date(val).getTime();
      if (!Number.isNaN(t) && t > latest) latest = t;
    }
  }
  return new Date(latest);
}

export function getLeadAgeDays(row: LeadMetricsRow, now = new Date()): number {
  return differenceInDays(now, new Date(row.dataHora));
}

export function getDiasSemAvanco(row: LeadMetricsRow, now = new Date()): number {
  return differenceInDays(now, getDataUltimaMudancaEtapa(row));
}

export function isLeadParado(row: LeadMetricsRow, now = new Date()): boolean {
  return isLeadEmAberto(row) && getDiasSemAvanco(row, now) >= 30;
}

export function getDiasEmCredito(row: LeadMetricsRow, now = new Date()): number | null {
  if (getLeadEtapaAtual(row) !== 'credito') return null;
  const inicio = row.dataAnaliseCreditoInicio;
  if (!inicio) return null;
  return differenceInDays(now, new Date(inicio));
}

export function isLeadCritico(row: LeadMetricsRow, now = new Date()): boolean {
  if (!isLeadEmAberto(row)) return false;
  const idade = getLeadAgeDays(row, now);
  const diasSemAvanco = getDiasSemAvanco(row, now);
  const diasCredito = getDiasEmCredito(row, now);
  if (idade >= 61) return true;
  if (diasSemAvanco >= 30) return true;
  if (diasCredito !== null && diasCredito >= 45) return true;
  if (getLeadEtapaAtual(row) === 'capturado' && diasSemAvanco >= 30) return true;
  return false;
}

export function getMaturationStatus(row: LeadMetricsRow, now = new Date()): MaturationStatus {
  if (!isLeadEmAberto(row)) return 'concluido';
  const idade = getLeadAgeDays(row, now);
  const diasSemAvanco = getDiasSemAvanco(row, now);
  if (idade >= 61 || diasSemAvanco >= 30) return 'critico';
  if (idade >= 31) return 'atencao';
  if (idade >= 8) return 'em_maturacao';
  return 'novo';
}

const ETAPA_GARGALO_LABELS: Record<string, string> = {
  capturado: 'Novo lead',
  em_aberto: 'Sem avanço',
  atendimento: 'Em atendimento',
  visita: 'Visita',
  credito: 'Análise de crédito',
  proposta: 'Proposta',
};

export function getEtapaDisplayLabel(row: LeadMetricsRow): string {
  const etapa = getLeadEtapaAtual(row);
  if (etapa === 'capturado' || etapa === 'em_aberto') return 'Sem avanço / aberto';
  return ETAPA_GARGALO_LABELS[etapa] ?? etapa;
}

export function computeTempoMedioAvanco(rows: LeadMetricsRow[]): TempoMedioItem[] {
  const samples: Record<string, number[]> = {
    'Lead → Atendimento': [],
    'Lead → Visita': [],
    'Lead → Análise de crédito': [],
    'Análise de crédito → Venda': [],
    'Lead → Venda': [],
  };

  for (const row of rows) {
    const entry = row.dataHora;
    const atend = row.dataPrimeiroAtendimento;
    const visita = row.dataVisitaRealizada ?? row.dataVisitaAgendada;
    const credito = row.dataAnaliseCreditoInicio;
    const venda = row.dataVenda ?? null;

    const d1 = avgDaysBetween(entry, atend);
    if (d1 !== null) samples['Lead → Atendimento']!.push(d1);

    const d2 = avgDaysBetween(entry, visita);
    if (d2 !== null) samples['Lead → Visita']!.push(d2);

    const d3 = avgDaysBetween(entry, credito);
    if (d3 !== null) samples['Lead → Análise de crédito']!.push(d3);

    const d4 = avgDaysBetween(credito, venda);
    if (d4 !== null) samples['Análise de crédito → Venda']!.push(d4);

    const d5 = avgDaysBetween(entry, venda);
    if (d5 !== null) samples['Lead → Venda']!.push(d5);
  }

  return Object.entries(samples).map(([label, values]) => ({
    label,
    dias:
      values.length > 0
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        : null,
  }));
}

export function aggregateIdadeEmAberto(rows: LeadMetricsRow[]): IdadeFaixaItem[] {
  const faixas: IdadeFaixaItem[] = [
    { faixa: '0 a 7 dias', count: 0 },
    { faixa: '8 a 15 dias', count: 0 },
    { faixa: '16 a 30 dias', count: 0 },
    { faixa: '31 a 60 dias', count: 0 },
    { faixa: '61+ dias', count: 0 },
  ];

  const now = new Date();
  for (const row of rows) {
    if (!isLeadEmAberto(row)) continue;
    const age = differenceInDays(now, new Date(row.dataHora));
    if (age <= 7) faixas[0]!.count += 1;
    else if (age <= 15) faixas[1]!.count += 1;
    else if (age <= 30) faixas[2]!.count += 1;
    else if (age <= 60) faixas[3]!.count += 1;
    else faixas[4]!.count += 1;
  }

  return faixas;
}

export function aggregateCreditoSituacao(rows: LeadMetricsRow[]): CreditoSituacao {
  const emCredito = rows.filter((r) => getLeadEtapaAtual(r) === 'credito');
  const tempos: number[] = [];
  let dentroDoPrazo = 0;
  let emAcompanhamento = 0;
  let acimaDoPrazo = 0;
  let maiorTempo: number | null = null;

  const now = new Date();
  for (const row of emCredito) {
    const inicio = row.dataAnaliseCreditoInicio;
    const fim = row.dataAnaliseCreditoFim;
    const dias =
      inicio && fim
        ? avgDaysBetween(inicio, fim)
        : inicio
          ? differenceInDays(now, new Date(inicio))
          : null;
    if (dias !== null) {
      tempos.push(dias);
      if (dias <= 5) dentroDoPrazo += 1;
      else if (dias <= 44) emAcompanhamento += 1;
      else acimaDoPrazo += 1;
      if (maiorTempo === null || dias > maiorTempo) maiorTempo = dias;
    }
  }

  const vendasAposCredito = rows.filter(
    (r) => (r.cvcrm_is_sold || r.dataVenda) && r.dataAnaliseCreditoInicio,
  ).length;

  return {
    emAnalise: emCredito.length,
    tempoMedioDias: averageDays(tempos),
    dentroDoPrazo,
    emAcompanhamento,
    acimaDoPrazo,
    maiorTempoDias: maiorTempo,
    aprovados: rows.filter((r) => r.cvcrm_is_sold && r.dataAnaliseCreditoInicio).length,
    reprovados: rows.filter((r) => getLeadEtapaAtual(r) === 'perdido' && r.dataAnaliseCreditoInicio)
      .length,
    vendasAposCredito,
  };
}

function maturacaoPct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function volumeGrowthPct(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function compareTrend(current: number, previous: number | null): MaturacaoResumoTrend {
  if (previous === null) return 'none';
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'flat';
}

function buildResumoMetric(
  count: number,
  pct: number,
  compareValue: number | null,
): MaturacaoResumoMetric {
  return {
    count,
    pct,
    trend: compareTrend(pct, compareValue),
  };
}

export function computeMaturacaoResumoCards(
  rows: LeadMetricsRow[],
  previousRows?: LeadMetricsRow[] | null,
): MaturacaoResumoCards {
  const stats = computeLeadsInfoboxStats(rows);
  const { leads, visitasAgendadas, atendimentoCorretor, vendas } = stats;

  const pctVisitas = maturacaoPct(visitasAgendadas, leads);
  const pctAtendimento = maturacaoPct(atendimentoCorretor, leads);
  const pctVendas = maturacaoPct(vendas, leads);

  const previous = previousRows ? computeMaturacaoResumoCards(previousRows) : null;

  const leadsGrowth = previous ? volumeGrowthPct(leads, previous.leads.count) : null;

  return {
    leads: {
      count: leads,
      pct: leadsGrowth !== null ? Math.abs(leadsGrowth) : leads > 0 ? 100 : 0,
      trend: previous ? compareTrend(leads, previous.leads.count) : 'none',
    },
    visitas: buildResumoMetric(
      visitasAgendadas,
      pctVisitas,
      previous?.visitas.pct ?? null,
    ),
    atendimento: buildResumoMetric(
      atendimentoCorretor,
      pctAtendimento,
      previous?.atendimento.pct ?? null,
    ),
    vendas: buildResumoMetric(vendas, pctVendas, previous?.vendas.pct ?? null),
  };
}

export function aggregateGargalosPorEtapa(rows: LeadMetricsRow[]): GargaloEtapaRow[] {
  const now = new Date();
  const map = new Map<string, { parados: number; tempos: number[] }>();

  for (const row of rows) {
    if (!isLeadEmAberto(row)) continue;
    const label = getEtapaDisplayLabel(row);
    const bucket = map.get(label) ?? { parados: 0, tempos: [] };
    if (isLeadParado(row, now)) {
      bucket.parados += 1;
      bucket.tempos.push(getDiasSemAvanco(row, now));
    }
    map.set(label, bucket);
  }

  return Array.from(map.entries())
    .map(([etapa, data]) => ({
      etapa,
      parados: data.parados,
      tempoMedioParado: averageDays(data.tempos),
    }))
    .sort((a, b) => b.parados - a.parados);
}

export function aggregateEmpreendimentoMaturacao(rows: LeadMetricsRow[]): EmpreendimentoMaturacaoRow[] {
  const now = new Date();
  const map = new Map<string, EmpreendimentoMaturacaoRow>();

  for (const row of rows) {
    const nome = resolveEmpreendimentoLabel(row);
    const bucket =
      map.get(nome) ??
      ({
        empreendimento: nome,
        emAberto: 0,
        dias31Plus: 0,
        dias61Plus: 0,
        atendimento: 0,
        visitas: 0,
        credito: 0,
        vendas: 0,
      } satisfies EmpreendimentoMaturacaoRow);

    if (isLeadEmAberto(row)) {
      bucket.emAberto += 1;
      const idade = getLeadAgeDays(row, now);
      if (idade >= 31) bucket.dias31Plus += 1;
      if (idade >= 61) bucket.dias61Plus += 1;
    }

    const etapa = getLeadEtapaAtual(row);
    if (etapa === 'atendimento') bucket.atendimento += 1;
    if (isVisitaAgendada(row)) bucket.visitas += 1;
    if (isAnaliseCreditoStage(row)) bucket.credito += 1;
    if (row.cvcrm_is_sold || row.dataVenda) bucket.vendas += 1;

    map.set(nome, bucket);
  }

  return Array.from(map.values()).sort((a, b) => b.emAberto - a.emAberto);
}

function criticoPrioridade(row: LeadRow, now: Date): number {
  const diasCredito = getDiasEmCredito(row, now);
  if (diasCredito !== null && diasCredito >= 45) return 4;
  if (getDiasSemAvanco(row, now) >= 30) return 3;
  if (getLeadAgeDays(row, now) >= 61) return 2;
  if (getLeadEtapaAtual(row) === 'capturado') return 1;
  return 0;
}

export function buildLeadsCriticos(rows: LeadRow[], limit = 100): LeadCriticoRow[] {
  const now = new Date();
  const criticos: LeadCriticoRow[] = [];

  for (const row of rows) {
    if (!isLeadCritico(row, now)) continue;
    criticos.push({
      id: row.id,
      nome: row.nome || '—',
      empreendimento: resolveEmpreendimentoLabel(row),
      origem: row.origem || '—',
      dataEntrada: row.dataHora,
      idadeDias: getLeadAgeDays(row, now),
      etapaAtual: getEtapaDisplayLabel(row),
      diasSemAvanco: getDiasSemAvanco(row, now),
      responsavel: row.responsavel?.trim() || '—',
      statusMaturacao: getMaturationStatus(row, now),
      prioridade: criticoPrioridade(row, now),
    });
  }

  return criticos
    .sort((a, b) => {
      if (b.prioridade !== a.prioridade) return b.prioridade - a.prioridade;
      return b.diasSemAvanco - a.diasSemAvanco;
    })
    .slice(0, limit);
}

export function hasMaturacaoDateData(rows: LeadMetricsRow[]): boolean {
  return rows.some((row) => rowHasStageDates(row));
}

export function getEtapaStackColor(key: string): string {
  return ETAPA_STACK_COLORS[key] ?? '#94a3b8';
}

export type OrigemLeadsRow = {
  origem: string;
  leads: number;
  qualificados: number;
  visitas: number;
};

export function aggregateOrigemLeadsTable(rows: LeadMetricsRow[]): OrigemLeadsRow[] {
  const map = new Map<string, OrigemLeadsRow>();
  for (const row of rows) {
    const origem = row.origem || '—';
    const bucket = map.get(origem) ?? { origem, leads: 0, qualificados: 0, visitas: 0 };
    bucket.leads += 1;
    if (
      leadRespondeuFormularioPerfil(row) &&
      (row.qualificacao === 'Alta' || row.qualificacao === 'Média')
    ) {
      bucket.qualificados += 1;
    }
    if (isVisitaAgendada(row)) {
      bucket.visitas += 1;
    }
    map.set(origem, bucket);
  }
  return Array.from(map.values()).sort((a, b) => b.leads - a.leads);
}

export type EmpreendimentoDesempenhoRow = {
  empreendimento: string;
  leads: number;
  qualificados: number;
  atendimento: number;
  visitas: number;
  credito: number;
  vendas: number;
  emAberto: number;
};

export function aggregateEmpreendimentoTable(rows: LeadMetricsRow[]): EmpreendimentoDesempenhoRow[] {
  const map = new Map<string, EmpreendimentoDesempenhoRow>();

  for (const row of rows) {
    const nome = resolveEmpreendimentoLabel(row);
    const bucket =
      map.get(nome) ??
      ({
        empreendimento: nome,
        leads: 0,
        qualificados: 0,
        atendimento: 0,
        visitas: 0,
        credito: 0,
        vendas: 0,
        emAberto: 0,
      } satisfies EmpreendimentoDesempenhoRow);

    bucket.leads += 1;
    if (
      leadRespondeuFormularioPerfil(row) &&
      (row.qualificacao === 'Alta' || row.qualificacao === 'Média')
    ) {
      bucket.qualificados += 1;
    }

    if (isAtendimentoCorretor(row)) bucket.atendimento += 1;
    if (isVisitaAgendada(row)) bucket.visitas += 1;
    if (isAnaliseCreditoStage(row)) bucket.credito += 1;
    if (row.cvcrm_is_sold || row.dataVenda) bucket.vendas += 1;
    if (isLeadEmAberto(row)) bucket.emAberto += 1;

    map.set(nome, bucket);
  }

  return Array.from(map.values()).sort((a, b) => b.leads - a.leads);
}

export type QualidadeBreakdownRow = {
  grupo: string;
  alta: number;
  media: number;
  baixa: number;
  indefinida: number;
};

export function aggregateQualidadeByGrupo(
  rows: LeadMetricsRow[],
  grupoFn: (row: LeadMetricsRow) => string,
): QualidadeBreakdownRow[] {
  const map = new Map<string, QualidadeBreakdownRow>();

  for (const row of rows) {
    const grupo = grupoFn(row) || '—';
    const bucket =
      map.get(grupo) ??
      ({ grupo, alta: 0, media: 0, baixa: 0, indefinida: 0 } satisfies QualidadeBreakdownRow);

    switch (row.qualificacao) {
      case 'Alta':
        bucket.alta += 1;
        break;
      case 'Média':
        bucket.media += 1;
        break;
      case 'Baixa':
        bucket.baixa += 1;
        break;
      default:
        bucket.indefinida += 1;
    }
    map.set(grupo, bucket);
  }

  return Array.from(map.values()).sort((a, b) => {
    const totalA = a.alta + a.media + a.baixa + a.indefinida;
    const totalB = b.alta + b.media + b.baixa + b.indefinida;
    return totalB - totalA;
  });
}
