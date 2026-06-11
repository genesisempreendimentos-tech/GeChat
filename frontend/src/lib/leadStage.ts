import type { LeadMetricsRow } from '@/lib/leadsMetrics';

export type LeadEtapaComercial =
  | 'venda'
  | 'proposta'
  | 'credito'
  | 'visita'
  | 'atendimento'
  | 'capturado'
  | 'perdido'
  | 'em_aberto';

const STAGE_PATTERNS: { etapa: LeadEtapaComercial; patterns: RegExp[] }[] = [
  { etapa: 'venda', patterns: [/venda/i, /vendido/i, /ganho/i] },
  { etapa: 'proposta', patterns: [/proposta/i, /negoci/i] },
  { etapa: 'credito', patterns: [/cr[eé]dito/i, /financiamento/i] },
  { etapa: 'visita', patterns: [/visita/i] },
  { etapa: 'atendimento', patterns: [/atendimento/i, /contato/i, /corretor/i] },
  { etapa: 'perdido', patterns: [/perdid/i, /descart/i, /cancel/i] },
];

function matchStage(text: string): LeadEtapaComercial | null {
  const normalized = text.trim();
  if (!normalized) return null;
  for (const { etapa, patterns } of STAGE_PATTERNS) {
    if (patterns.some((p) => p.test(normalized))) return etapa;
  }
  return null;
}

function stageTexts(row: LeadMetricsRow): string[] {
  return [row.cvcrm_stage, row.cvcrm_situation, row.cvcrm_status]
    .filter((v): v is string => Boolean(v?.trim()))
    .map((v) => v!.trim());
}

function etapaFromStatus(status: LeadMetricsRow['status']): LeadEtapaComercial | null {
  switch (status) {
    case 'ganho':
      return 'venda';
    case 'perdido':
      return 'perdido';
    case 'negociacao':
      return 'proposta';
    case 'qualificado':
    case 'contato':
      return 'atendimento';
    default:
      return null;
  }
}

export function isLeadPerdido(row: LeadMetricsRow): boolean {
  if (row.dataPerdido) return true;
  if (row.status === 'perdido') return true;
  return stageTexts(row).some((t) => matchStage(t) === 'perdido');
}

/** Etapa mais avançada do lead com base apenas nos campos do registro. */
export function getLeadEtapaAtual(row: LeadMetricsRow): LeadEtapaComercial {
  if (isLeadPerdido(row)) return 'perdido';
  if (row.cvcrm_is_sold || row.dataVenda || row.status === 'ganho') return 'venda';
  if (row.dataProposta) return 'proposta';
  if (row.dataAnaliseCreditoInicio) return 'credito';
  if (row.dataVisitaRealizada || row.dataVisitaAgendada) return 'visita';
  if (row.dataPrimeiroAtendimento) return 'atendimento';

  for (const text of stageTexts(row)) {
    const matched = matchStage(text);
    if (matched && matched !== 'capturado') return matched;
  }

  const fromStatus = etapaFromStatus(row.status);
  if (fromStatus) return fromStatus;

  return 'capturado';
}

export function isAtendimentoCorretor(row: LeadMetricsRow): boolean {
  if (isLeadPerdido(row) || row.cvcrm_is_sold) return false;
  return getLeadEtapaAtual(row) === 'atendimento';
}

export function isVisitaAgendada(row: LeadMetricsRow): boolean {
  if (isLeadPerdido(row)) return false;
  if (row.dataVisitaRealizada || row.dataVisitaAgendada) return true;
  const etapa = getLeadEtapaAtual(row);
  return etapa === 'visita' || etapa === 'credito' || etapa === 'proposta' || etapa === 'venda';
}

export function isPropostaLead(row: LeadMetricsRow): boolean {
  if (isLeadPerdido(row)) return false;
  if (row.dataProposta) return true;
  const etapa = getLeadEtapaAtual(row);
  return etapa === 'proposta' || etapa === 'venda';
}

export function isAnaliseCreditoStage(row: LeadMetricsRow): boolean {
  if (isLeadPerdido(row)) return false;
  if (row.dataAnaliseCreditoInicio) return true;
  const etapa = getLeadEtapaAtual(row);
  return etapa === 'credito' || etapa === 'proposta';
}

export function isLeadEmAberto(row: LeadMetricsRow): boolean {
  const etapa = getLeadEtapaAtual(row);
  return etapa !== 'venda' && etapa !== 'perdido';
}

export type LeadStageDates = {
  dataPrimeiroAtendimento?: string | null;
  dataVisitaAgendada?: string | null;
  dataVisitaRealizada?: string | null;
  dataAnaliseCreditoInicio?: string | null;
  dataAnaliseCreditoFim?: string | null;
  dataProposta?: string | null;
  dataVenda?: string | null;
  dataPerdido?: string | null;
};

export function rowHasStageDates(row: LeadMetricsRow & LeadStageDates): boolean {
  return Boolean(
    row.dataPrimeiroAtendimento ||
      row.dataVisitaAgendada ||
      row.dataVisitaRealizada ||
      row.dataAnaliseCreditoInicio ||
      row.dataProposta ||
      row.dataVenda,
  );
}

export function stageDateFieldForEtapa(
  etapa: LeadEtapaComercial,
): keyof LeadStageDates | null {
  switch (etapa) {
    case 'atendimento':
      return 'dataPrimeiroAtendimento';
    case 'visita':
      return 'dataVisitaRealizada';
    case 'credito':
      return 'dataAnaliseCreditoInicio';
    case 'proposta':
      return 'dataProposta';
    case 'venda':
      return 'dataVenda';
    case 'perdido':
      return 'dataPerdido';
    default:
      return null;
  }
}
