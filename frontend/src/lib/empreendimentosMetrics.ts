import { getLeadAgeDays } from '@/lib/dadosMaturacao';
import { resolveEmpreendimentoLabel, resolveEmpreendimentoPagina } from '@/lib/leadEmpreendimento';
import type { LeadRow } from '@/lib/leadRow';
import {
  isAnaliseCreditoStage,
  isAtendimentoCorretor,
  isLeadEmAberto,
  isVisitaAgendada,
} from '@/lib/leadStage';
import { leadRespondeuFormularioPerfil } from '@/rules/qualifyLead';

export type EmpreendimentoStatus =
  | 'BOM_DESEMPENHO'
  | 'BOM_VOLUME'
  | 'ALTA_QUALIDADE'
  | 'BAIXO_AVANCO'
  | 'SEM_AVANCO_COMERCIAL'
  | 'BASE_ENVELHECIDA'
  | 'CRITICO'
  | 'POUCOS_DADOS'
  | 'EM_ANALISE';

export type OrigemBucket =
  | 'direto'
  | 'meta'
  | 'google'
  | 'organico'
  | 'whatsapp'
  | 'formulario'
  | 'outros'
  | 'semOrigem';

export type OrigemCounts = Record<OrigemBucket, number>;

export type EmpreendimentoMetrics = {
  empreendimentoId: string;
  empreendimentoNome: string;
  leads: number;
  percentualDoTotal: number;
  alta: number;
  media: number;
  baixa: number;
  indefinida: number;
  qualificados: number;
  taxaQualificacao: number;
  taxaIndefinida: number;
  atendimento: number;
  taxaAtendimento: number;
  visitas: number;
  taxaVisitaSobreAtendimento: number;
  taxaVisitaSobreLeads: number;
  credito: number;
  taxaCreditoSobreVisitas: number;
  vendas: number;
  taxaVendaSobreLeads: number;
  taxaVendaSobreCredito: number;
  emAberto: number;
  leads0a7: number;
  leads8a15: number;
  leads16a30: number;
  leads31a60: number;
  leads61Mais: number;
  percentual61Mais: number;
  origem: OrigemCounts;
  principalGargalo: string;
  status: EmpreendimentoStatus;
};

export type EmpreendimentoResumoCards = {
  empreendimentosAtivos: number;
  leadsCaptados: number;
  leadsQualificados: number;
  emAtendimento: number;
  visitas: number;
  vendas: number;
  leadsEmAberto: number;
};

export type EmpreendimentoDestaque = {
  tipo: 'volume' | 'qualidade' | 'avanco' | 'gargalo';
  titulo: string;
  empreendimento: string;
  empreendimentoId: string;
  detalhe: string;
};

export type EmpreendimentoQualidadeRow = {
  empreendimento: string;
  alta: number;
  media: number;
  baixa: number;
  indefinida: number;
  taxaQualificacao: number;
  taxaIndefinida: number;
  qualidadeLimitada: boolean;
};

export type EmpreendimentoGargaloRow = {
  empreendimento: string;
  principalGargalo: string;
  evidencia: string;
};

export type EmpreendimentoOrigemRow = {
  empreendimento: string;
  direto: number;
  meta: number;
  google: number;
  organico: number;
  whatsapp: number;
  formulario: number;
  outros: number;
  semOrigem: number;
};

export const EMPREENDIMENTO_STATUS_LABELS: Record<EmpreendimentoStatus, string> = {
  BOM_DESEMPENHO: 'Bom desempenho',
  BOM_VOLUME: 'Bom volume',
  ALTA_QUALIDADE: 'Alta qualidade',
  BAIXO_AVANCO: 'Baixo avanço',
  SEM_AVANCO_COMERCIAL: 'Sem avanço comercial',
  BASE_ENVELHECIDA: 'Base envelhecida',
  CRITICO: 'Crítico',
  POUCOS_DADOS: 'Poucos dados',
  EM_ANALISE: 'Em análise',
};

export const EMPREENDIMENTO_STATUS_FILTER_OPTIONS: {
  value: EmpreendimentoStatus;
  label: string;
}[] = Object.entries(EMPREENDIMENTO_STATUS_LABELS).map(([value, label]) => ({
  value: value as EmpreendimentoStatus,
  label,
}));

const MIN_VOLUME_DESTAQUE = 10;

export function calcPercentage(part: number, total: number, decimals = 1): number {
  if (!total || total <= 0) return 0;
  return Number(((part / total) * 100).toFixed(decimals));
}

function emptyOrigemCounts(): OrigemCounts {
  return {
    direto: 0,
    meta: 0,
    google: 0,
    organico: 0,
    whatsapp: 0,
    formulario: 0,
    outros: 0,
    semOrigem: 0,
  };
}

export function normalizeOrigem(origem: string | undefined | null): OrigemBucket {
  const value = (origem ?? '').trim().toLowerCase();
  if (!value) return 'semOrigem';
  if (value === 'direto') return 'direto';
  if (/meta|facebook|instagram|ads/.test(value)) return 'meta';
  if (/google|adwords|gads/.test(value)) return 'google';
  if (/org[aâ]nic|seo|busca/.test(value)) return 'organico';
  if (/whatsapp|zap/.test(value)) return 'whatsapp';
  if (/form|email|@/.test(value)) return 'formulario';
  return 'outros';
}

function incrementOrigem(counts: OrigemCounts, origem: string | undefined | null) {
  const bucket = normalizeOrigem(origem);
  counts[bucket] += 1;
}

export function getBaseMaturacaoStatus(
  pct61Mais: number,
): 'Saudável' | 'Atenção' | 'Envelhecida' | 'Crítica' {
  if (pct61Mais >= 60) return 'Crítica';
  if (pct61Mais >= 40) return 'Envelhecida';
  if (pct61Mais >= 20) return 'Atenção';
  return 'Saudável';
}

export function getPrincipalGargalo(item: EmpreendimentoMetrics): string {
  const taxaQualificacao = item.taxaQualificacao;
  const taxaAtendimento = item.taxaAtendimento;
  const taxaVisita = calcPercentage(item.visitas, item.atendimento);
  const taxaCredito = calcPercentage(item.credito, item.visitas);
  const taxaVenda = calcPercentage(item.vendas, item.credito || item.leads);
  const taxa61Mais = item.percentual61Mais;

  if (taxaQualificacao < 10 && item.leads >= 30) return 'Qualificação';
  if (taxaAtendimento < 20 && item.leads >= 30) return 'Atendimento';
  if (item.atendimento >= 10 && taxaVisita < 10) return 'Visitas';
  if (item.visitas >= 5 && taxaCredito < 10) return 'Análise de crédito';
  if (item.credito >= 3 && taxaVenda < 10) return 'Vendas';
  if (taxa61Mais >= 40 && item.emAberto >= 20) return 'Base envelhecida';
  if (taxaAtendimento < 5 && item.leads >= 20) return 'Sem avanço comercial';

  return 'Sem gargalo crítico';
}

export function getEmpreendimentoStatus(item: EmpreendimentoMetrics): EmpreendimentoStatus {
  if (item.leads < 10) return 'POUCOS_DADOS';

  const taxaQualificacao = item.taxaQualificacao;
  const taxaAtendimento = item.taxaAtendimento;
  const taxaLeadsAntigos = item.percentual61Mais;

  if (taxaLeadsAntigos >= 40 && item.emAberto >= 30) return 'BASE_ENVELHECIDA';
  if (taxaQualificacao < 5 && taxaAtendimento < 10) return 'CRITICO';
  if (taxaAtendimento < 15 && item.leads >= 50) return 'BAIXO_AVANCO';
  if (taxaAtendimento < 5 && item.leads >= 20) return 'SEM_AVANCO_COMERCIAL';
  if (taxaQualificacao >= 40 && taxaAtendimento >= 40) return 'BOM_DESEMPENHO';
  if (taxaQualificacao >= 40) return 'ALTA_QUALIDADE';
  if (item.leads >= 100) return 'BOM_VOLUME';

  return 'EM_ANALISE';
}

function createEmptyMetrics(empreendimentoId: string, empreendimentoNome: string): EmpreendimentoMetrics {
  return {
    empreendimentoId,
    empreendimentoNome,
    leads: 0,
    percentualDoTotal: 0,
    alta: 0,
    media: 0,
    baixa: 0,
    indefinida: 0,
    qualificados: 0,
    taxaQualificacao: 0,
    taxaIndefinida: 0,
    atendimento: 0,
    taxaAtendimento: 0,
    visitas: 0,
    taxaVisitaSobreAtendimento: 0,
    taxaVisitaSobreLeads: 0,
    credito: 0,
    taxaCreditoSobreVisitas: 0,
    vendas: 0,
    taxaVendaSobreLeads: 0,
    taxaVendaSobreCredito: 0,
    emAberto: 0,
    leads0a7: 0,
    leads8a15: 0,
    leads16a30: 0,
    leads31a60: 0,
    leads61Mais: 0,
    percentual61Mais: 0,
    origem: emptyOrigemCounts(),
    principalGargalo: 'Sem gargalo crítico',
    status: 'POUCOS_DADOS',
  };
}

function finalizeMetrics(item: EmpreendimentoMetrics, totalLeads: number): EmpreendimentoMetrics {
  item.qualificados = item.alta + item.media;
  item.percentualDoTotal = calcPercentage(item.leads, totalLeads);
  item.taxaQualificacao = calcPercentage(item.qualificados, item.leads);
  item.taxaIndefinida = calcPercentage(item.indefinida, item.leads);
  item.taxaAtendimento = calcPercentage(item.atendimento, item.leads);
  item.taxaVisitaSobreAtendimento = calcPercentage(item.visitas, item.atendimento);
  item.taxaVisitaSobreLeads = calcPercentage(item.visitas, item.leads);
  item.taxaCreditoSobreVisitas = calcPercentage(item.credito, item.visitas);
  item.taxaVendaSobreLeads = calcPercentage(item.vendas, item.leads);
  item.taxaVendaSobreCredito = calcPercentage(item.vendas, item.credito);
  item.percentual61Mais = calcPercentage(item.leads61Mais, item.emAberto);
  item.principalGargalo = getPrincipalGargalo(item);
  item.status = getEmpreendimentoStatus(item);
  return item;
}

export function aggregateEmpreendimentoMetrics(rows: LeadRow[]): EmpreendimentoMetrics[] {
  const now = new Date();
  const map = new Map<string, EmpreendimentoMetrics>();

  for (const row of rows) {
    const empreendimentoId = resolveEmpreendimentoPagina(row);
    const empreendimentoNome = resolveEmpreendimentoLabel(row);
    const bucket =
      map.get(empreendimentoId) ?? createEmptyMetrics(empreendimentoId, empreendimentoNome);

    bucket.leads += 1;

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

    if (isAtendimentoCorretor(row)) bucket.atendimento += 1;
    if (isVisitaAgendada(row)) bucket.visitas += 1;
    if (isAnaliseCreditoStage(row)) bucket.credito += 1;
    if (row.cvcrm_is_sold || row.dataVenda) bucket.vendas += 1;

    if (isLeadEmAberto(row)) {
      bucket.emAberto += 1;
      const age = getLeadAgeDays(row, now);
      if (age <= 7) bucket.leads0a7 += 1;
      else if (age <= 15) bucket.leads8a15 += 1;
      else if (age <= 30) bucket.leads16a30 += 1;
      else if (age <= 60) bucket.leads31a60 += 1;
      else bucket.leads61Mais += 1;
    }

    incrementOrigem(bucket.origem, row.origem || row.canal);

    map.set(empreendimentoId, bucket);
  }

  const totalLeads = rows.length;
  return Array.from(map.values())
    .map((item) => finalizeMetrics(item, totalLeads))
    .sort((a, b) => b.leads - a.leads);
}

export function computeEmpreendimentoResumoCards(
  metrics: EmpreendimentoMetrics[],
): EmpreendimentoResumoCards {
  return {
    empreendimentosAtivos: metrics.filter((m) => m.leads > 0).length,
    leadsCaptados: metrics.reduce((sum, m) => sum + m.leads, 0),
    leadsQualificados: metrics.reduce((sum, m) => sum + m.qualificados, 0),
    emAtendimento: metrics.reduce((sum, m) => sum + m.atendimento, 0),
    visitas: metrics.reduce((sum, m) => sum + m.visitas, 0),
    vendas: metrics.reduce((sum, m) => sum + m.vendas, 0),
    leadsEmAberto: metrics.reduce((sum, m) => sum + m.emAberto, 0),
  };
}

function formatPct(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export function computeEmpreendimentoDestaques(
  metrics: EmpreendimentoMetrics[],
): EmpreendimentoDestaque[] {
  const withVolume = metrics.filter((m) => m.leads >= MIN_VOLUME_DESTAQUE);
  if (!withVolume.length) {
    return [
      {
        tipo: 'volume',
        titulo: 'Maior volume',
        empreendimento: '—',
        empreendimentoId: '',
        detalhe: 'Volume insuficiente para destaques',
      },
      {
        tipo: 'qualidade',
        titulo: 'Melhor qualidade',
        empreendimento: '—',
        empreendimentoId: '',
        detalhe: 'Volume insuficiente para destaques',
      },
      {
        tipo: 'avanco',
        titulo: 'Melhor avanço comercial',
        empreendimento: '—',
        empreendimentoId: '',
        detalhe: 'Volume insuficiente para destaques',
      },
      {
        tipo: 'gargalo',
        titulo: 'Maior gargalo',
        empreendimento: '—',
        empreendimentoId: '',
        detalhe: 'Volume insuficiente para destaques',
      },
    ];
  }

  const maiorVolume = [...withVolume].sort((a, b) => b.leads - a.leads)[0]!;
  const melhorQualidade = [...withVolume].sort(
    (a, b) => b.taxaQualificacao - a.taxaQualificacao || b.leads - a.leads,
  )[0]!;
  const melhorAvanco = [...withVolume].sort(
    (a, b) => b.taxaAtendimento - a.taxaAtendimento || b.leads - a.leads,
  )[0]!;

  const gargaloCandidates = withVolume.filter(
    (m) => m.principalGargalo !== 'Sem gargalo crítico',
  );
  const maiorGargalo =
    gargaloCandidates.sort((a, b) => b.leads - a.leads)[0] ??
    [...withVolume].sort((a, b) => b.leads - a.leads)[0]!;

  return [
    {
      tipo: 'volume',
      titulo: 'Maior volume',
      empreendimento: maiorVolume.empreendimentoNome,
      empreendimentoId: maiorVolume.empreendimentoId,
      detalhe: `${maiorVolume.leads.toLocaleString('pt-BR')} leads`,
    },
    {
      tipo: 'qualidade',
      titulo: 'Melhor qualidade',
      empreendimento: melhorQualidade.empreendimentoNome,
      empreendimentoId: melhorQualidade.empreendimentoId,
      detalhe: `${formatPct(melhorQualidade.taxaQualificacao)} qualificados`,
    },
    {
      tipo: 'avanco',
      titulo: 'Melhor avanço comercial',
      empreendimento: melhorAvanco.empreendimentoNome,
      empreendimentoId: melhorAvanco.empreendimentoId,
      detalhe: `${formatPct(melhorAvanco.taxaAtendimento)} em atendimento`,
    },
    {
      tipo: 'gargalo',
      titulo: 'Maior gargalo',
      empreendimento: maiorGargalo.empreendimentoNome,
      empreendimentoId: maiorGargalo.empreendimentoId,
      detalhe: `${maiorGargalo.leads.toLocaleString('pt-BR')} leads — ${maiorGargalo.principalGargalo}`,
    },
  ];
}

export function toQualidadeRows(metrics: EmpreendimentoMetrics[]): EmpreendimentoQualidadeRow[] {
  return metrics.map((m) => ({
    empreendimento: m.empreendimentoNome,
    alta: m.alta,
    media: m.media,
    baixa: m.baixa,
    indefinida: m.indefinida,
    taxaQualificacao: m.taxaQualificacao,
    taxaIndefinida: m.taxaIndefinida,
    qualidadeLimitada: m.taxaIndefinida >= 50,
  }));
}

function buildGargaloEvidencia(m: EmpreendimentoMetrics): string {
  switch (m.principalGargalo) {
    case 'Qualificação':
      return `${m.leads.toLocaleString('pt-BR')} leads, apenas ${m.qualificados.toLocaleString('pt-BR')} qualificados`;
    case 'Atendimento':
      return `${m.leads.toLocaleString('pt-BR')} leads, apenas ${m.atendimento.toLocaleString('pt-BR')} em atendimento`;
    case 'Visitas':
      return `${m.atendimento.toLocaleString('pt-BR')} atendidos, ${m.visitas.toLocaleString('pt-BR')} visitas`;
    case 'Análise de crédito':
      return `${m.visitas.toLocaleString('pt-BR')} visitas, ${m.credito.toLocaleString('pt-BR')} em crédito`;
    case 'Vendas':
      return `${m.credito.toLocaleString('pt-BR')} em crédito, ${m.vendas.toLocaleString('pt-BR')} vendas`;
    case 'Base envelhecida':
      return `${formatPct(m.percentual61Mais)} dos leads em aberto com 61+ dias`;
    case 'Sem avanço comercial':
      return `${m.leads.toLocaleString('pt-BR')} leads, ${formatPct(m.taxaAtendimento)} em atendimento`;
    default:
      return 'Sem evidência crítica no período';
  }
}

export function toGargaloRows(metrics: EmpreendimentoMetrics[]): EmpreendimentoGargaloRow[] {
  return metrics
    .filter((m) => m.principalGargalo !== 'Sem gargalo crítico')
    .map((m) => ({
      empreendimento: m.empreendimentoNome,
      principalGargalo: m.principalGargalo,
      evidencia: buildGargaloEvidencia(m),
    }))
    .sort((a, b) => a.principalGargalo.localeCompare(b.principalGargalo, 'pt-BR'));
}

export function toOrigemRows(metrics: EmpreendimentoMetrics[]): EmpreendimentoOrigemRow[] {
  return metrics.map((m) => ({
    empreendimento: m.empreendimentoNome,
    direto: m.origem.direto,
    meta: m.origem.meta,
    google: m.origem.google,
    organico: m.origem.organico,
    whatsapp: m.origem.whatsapp,
    formulario: m.origem.formulario,
    outros: m.origem.outros,
    semOrigem: m.origem.semOrigem,
  }));
}

export function metricsToBarRankItems(
  metrics: EmpreendimentoMetrics[],
  metric: EmpreendimentoBarMetric,
): { name: string; value: number }[] {
  return metrics.map((m) => ({
    name: m.empreendimentoNome,
    value: getMetricValue(m, metric),
  }));
}

export type EmpreendimentoBarMetric =
  | 'leads'
  | 'qualificados'
  | 'atendimento'
  | 'visitas'
  | 'vendas'
  | 'emAberto';

export const EMPREENDIMENTO_BAR_METRIC_OPTIONS: { value: EmpreendimentoBarMetric; label: string }[] =
  [
    { value: 'leads', label: 'Leads' },
    { value: 'qualificados', label: 'Qualificados' },
    { value: 'atendimento', label: 'Atendimento' },
    { value: 'visitas', label: 'Visitas' },
    { value: 'vendas', label: 'Vendas' },
    { value: 'emAberto', label: 'Em aberto' },
  ];

function getMetricValue(m: EmpreendimentoMetrics, metric: EmpreendimentoBarMetric): number {
  switch (metric) {
    case 'qualificados':
      return m.qualificados;
    case 'atendimento':
      return m.atendimento;
    case 'visitas':
      return m.visitas;
    case 'vendas':
      return m.vendas;
    case 'emAberto':
      return m.emAberto;
    default:
      return m.leads;
  }
}

export function buildEmpreendimentoInsights(metrics: EmpreendimentoMetrics[]): string[] {
  const insights: string[] = [];
  if (!metrics.length) return insights;

  const totalLeads = metrics.reduce((sum, m) => sum + m.leads, 0);
  const top = metrics[0];
  if (top && totalLeads > 0) {
    insights.push(
      `${top.empreendimentoNome} concentra ${formatPct(top.percentualDoTotal)} dos leads do período.`,
    );
  }

  const qualidade = [...metrics]
    .filter((m) => m.leads >= MIN_VOLUME_DESTAQUE)
    .sort((a, b) => b.taxaQualificacao - a.taxaQualificacao)[0];
  if (qualidade) {
    insights.push(
      `${qualidade.empreendimentoNome} apresenta a melhor taxa de qualificação entre empreendimentos com volume relevante.`,
    );
  }

  const piorQualidade = [...metrics]
    .filter((m) => m.leads >= 30)
    .sort((a, b) => a.taxaQualificacao - b.taxaQualificacao)[0];
  if (piorQualidade && piorQualidade.taxaQualificacao < 15) {
    insights.push(
      `${piorQualidade.empreendimentoNome} tem baixa taxa de qualificação (${formatPct(piorQualidade.taxaQualificacao)}).`,
    );
  }

  const baixoAvanco = metrics.find(
    (m) => m.leads >= 50 && m.taxaAtendimento < 15,
  );
  if (baixoAvanco) {
    insights.push(
      `${baixoAvanco.empreendimentoNome} tem alto volume, mas baixo avanço para atendimento.`,
    );
  }

  const zeroVisitas = metrics.find(
    (m) => m.atendimento >= 10 && m.visitas === 0,
  );
  if (zeroVisitas) {
    insights.push(
      `${zeroVisitas.empreendimentoNome} tem atendimento, mas não registra visitas.`,
    );
  }

  const envelhecida = metrics.find((m) => m.percentual61Mais >= 40 && m.emAberto >= 20);
  if (envelhecida) {
    insights.push(
      `${envelhecida.empreendimentoNome} possui muitos leads em aberto há mais de 61 dias.`,
    );
  }

  const diretoAlto = metrics.filter((m) => {
    const totalOrigem = Object.values(m.origem).reduce((a, b) => a + b, 0);
    return totalOrigem > 0 && calcPercentage(m.origem.direto, totalOrigem) >= 70;
  });
  if (diretoAlto.length >= Math.ceil(metrics.length / 2)) {
    insights.push(
      'Grande parte dos leads aparece como Direto. Verifique UTMs e rastreamento das campanhas.',
    );
  }

  const indefinidos = metrics.filter((m) => m.taxaIndefinida >= 50 && m.leads >= 20);
  if (indefinidos.length > 0) {
    insights.push(
      'Muitos leads estão sem qualificação. A comparação entre empreendimentos pode ficar limitada.',
    );
  }

  return insights.slice(0, 6);
}

export function hasLeadsSemEmpreendimento(rows: LeadRow[]): boolean {
  return rows.some((row) => {
    const pagina = resolveEmpreendimentoPagina(row);
    const nome = resolveEmpreendimentoLabel(row);
    return pagina === '/' || !nome.trim() || nome === '—';
  });
}

export function countPerfilCompleto(rows: LeadRow[]): number {
  return rows.filter((row) => leadRespondeuFormularioPerfil(row)).length;
}

export const ORIGEM_LABELS: Record<OrigemBucket, string> = {
  direto: 'Direto',
  meta: 'Meta',
  google: 'Google',
  organico: 'Orgânico',
  whatsapp: 'WhatsApp',
  formulario: 'Formulário',
  outros: 'Outros',
  semOrigem: 'Sem origem',
};

export type OrigemBreakdownItem = {
  bucket: OrigemBucket;
  label: string;
  count: number;
  pct: number;
};

export function getOrigemBreakdown(origem: OrigemCounts): OrigemBreakdownItem[] {
  const total = Object.values(origem).reduce((sum, value) => sum + value, 0);
  return (Object.keys(origem) as OrigemBucket[])
    .map((bucket) => ({
      bucket,
      label: ORIGEM_LABELS[bucket],
      count: origem[bucket],
      pct: calcPercentage(origem[bucket], total),
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function buildSingleEmpreendimentoInsights(item: EmpreendimentoMetrics): string[] {
  const insights: string[] = [];
  const formatPctLocal = (value: number) =>
    `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

  if (item.percentualDoTotal >= 40) {
    insights.push(
      `Concentra ${formatPctLocal(item.percentualDoTotal)} dos leads do período filtrado.`,
    );
  }

  if (item.taxaIndefinida >= 50 && item.leads >= 10) {
    insights.push('Muitos leads sem qualificação — leitura de qualidade limitada.');
  }

  if (item.leads >= 50 && item.taxaAtendimento < 15) {
    insights.push('Alto volume, mas baixo avanço para atendimento comercial.');
  }

  if (item.atendimento >= 10 && item.visitas === 0) {
    insights.push('Há atendimento registrado, mas nenhuma visita no período.');
  }

  if (item.percentual61Mais >= 40 && item.emAberto >= 20) {
    insights.push('Base envelhecida: muitos leads em aberto há mais de 61 dias.');
  }

  const totalOrigem = Object.values(item.origem).reduce((sum, value) => sum + value, 0);
  if (totalOrigem > 0 && calcPercentage(item.origem.direto, totalOrigem) >= 70) {
    insights.push('Mais de 70% dos leads aparecem como Direto — verifique UTMs.');
  }

  if (item.principalGargalo !== 'Sem gargalo crítico') {
    insights.push(`Principal gargalo: ${item.principalGargalo}.`);
  }

  return insights.slice(0, 5);
}
