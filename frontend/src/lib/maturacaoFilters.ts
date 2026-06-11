import { subDays, format } from 'date-fns';
import { filterDadosRows, type DadosFilterOptions } from '@/lib/dadosFilters';
import { getLeadAgeDays, getMaturationStatus, type MaturationStatus } from '@/lib/dadosMaturacao';
import { getLeadEtapaAtual, type LeadEtapaComercial } from '@/lib/leadStage';
import { resolveEmpreendimentoPagina } from '@/lib/leadEmpreendimento';
import type { LeadRow } from '@/lib/leadRow';

export type MaturacaoFaixaTemporal = 'ate_90' | '90_180' | '180_360' | '360_plus' | 'custom';

export type MaturacaoFilters = {
  dataInicial: string;
  dataFinal: string;
  faixaTemporal: MaturacaoFaixaTemporal;
  empreendimento: string;
  origem: string;
  etapaAtual: string;
  qualificacao: string;
  statusMaturacao: MaturationStatus | '';
  responsavel: string;
};

export type MaturacaoFilterOptions = DadosFilterOptions & {
  responsaveis: string[];
  statusMaturacao: { value: MaturationStatus; label: string }[];
};

export const MATURACAO_STATUS_OPTIONS: { value: MaturationStatus; label: string }[] = [
  { value: 'novo', label: 'Novo (0–7 dias)' },
  { value: 'em_maturacao', label: 'Em maturação (8–30 dias)' },
  { value: 'atencao', label: 'Atenção (31–60 dias)' },
  { value: 'critico', label: 'Crítico' },
  { value: 'concluido', label: 'Concluído' },
];

export const MATURACAO_FAIXA_TEMPORAL_OPTIONS: {
  value: Exclude<MaturacaoFaixaTemporal, 'custom'>;
  label: string;
  subtitle: string;
}[] = [
  { value: 'ate_90', label: '3 meses até hoje', subtitle: '0 a 89 dias' },
  { value: '90_180', label: '90 a 180 dias', subtitle: '3 a 6 meses' },
  { value: '180_360', label: '180 a 360 dias', subtitle: '6 a 12 meses' },
  { value: '360_plus', label: '360+ dias', subtitle: 'Mais de 1 ano' },
];

function formatDateInput(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function faixaTemporalToRange(
  faixa: Exclude<MaturacaoFaixaTemporal, 'custom'>,
): { from: string; to: string } {
  const today = new Date();
  switch (faixa) {
    case 'ate_90':
      return { from: formatDateInput(subDays(today, 89)), to: formatDateInput(today) };
    case '90_180':
      return {
        from: formatDateInput(subDays(today, 179)),
        to: formatDateInput(subDays(today, 90)),
      };
    case '180_360':
      return {
        from: formatDateInput(subDays(today, 359)),
        to: formatDateInput(subDays(today, 180)),
      };
    case '360_plus':
      return { from: '', to: formatDateInput(subDays(today, 360)) };
  }
}

export function matchesFaixaTemporal(
  row: LeadRow,
  faixa: Exclude<MaturacaoFaixaTemporal, 'custom'>,
  now = new Date(),
): boolean {
  const age = getLeadAgeDays(row, now);
  switch (faixa) {
    case 'ate_90':
      return age < 90;
    case '90_180':
      return age >= 90 && age < 180;
    case '180_360':
      return age >= 180 && age < 360;
    case '360_plus':
      return age >= 360;
  }
}

function emptyMaturacaoFilters(): MaturacaoFilters {
  return {
    dataInicial: '',
    dataFinal: '',
    faixaTemporal: 'custom',
    empreendimento: '',
    origem: '',
    etapaAtual: '',
    qualificacao: '',
    statusMaturacao: '',
    responsavel: '',
  };
}

export function buildMaturacaoFiltersFromFaixa(
  faixa: Exclude<MaturacaoFaixaTemporal, 'custom'>,
  base?: Partial<MaturacaoFilters>,
): MaturacaoFilters {
  const range = faixaTemporalToRange(faixa);
  return {
    ...emptyMaturacaoFilters(),
    ...base,
    faixaTemporal: faixa,
    dataInicial: range.from,
    dataFinal: range.to,
  };
}

export function defaultMaturacaoFilters(): MaturacaoFilters {
  return buildMaturacaoFiltersFromFaixa('ate_90');
}

const FAIXA_TEMPORAL_ORDER: Exclude<MaturacaoFaixaTemporal, 'custom'>[] = [
  'ate_90',
  '90_180',
  '180_360',
  '360_plus',
];

export function getPreviousMaturacaoFaixa(
  faixa: MaturacaoFaixaTemporal,
): Exclude<MaturacaoFaixaTemporal, 'custom'> | null {
  if (faixa === 'custom') return null;
  const index = FAIXA_TEMPORAL_ORDER.indexOf(faixa);
  if (index <= 0) return null;
  return FAIXA_TEMPORAL_ORDER[index - 1] ?? null;
}

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

export function collectMaturacaoFilterOptions(rows: LeadRow[]): MaturacaoFilterOptions {
  const responsaveis = new Set<string>();
  const empreendimentos = new Set<string>();
  const origens = new Set<string>();
  const qualificacoes = new Set<string>();
  const etapas = new Set<string>();

  for (const row of rows) {
    const r = row.responsavel?.trim();
    if (r) responsaveis.add(r);
    const pagina = resolveEmpreendimentoPagina(row);
    if (pagina) empreendimentos.add(pagina);
    if (row.origem) origens.add(row.origem);
    if (row.qualificacao) qualificacoes.add(row.qualificacao);
    etapas.add(ETAPA_LABELS[getLeadEtapaAtual(row)]);
  }

  const sortPt = (a: string, b: string) => a.localeCompare(b, 'pt-BR');

  return {
    empreendimentos: Array.from(empreendimentos).sort(sortPt),
    origens: Array.from(origens).sort(sortPt),
    dispositivos: [],
    canais: [],
    qualificacoes: Array.from(qualificacoes).sort(sortPt),
    etapas: Array.from(etapas).sort(sortPt),
    responsaveis: Array.from(responsaveis).sort(sortPt),
    statusMaturacao: MATURACAO_STATUS_OPTIONS,
  };
}

export function filterMaturacaoRows(rows: LeadRow[], filtros: MaturacaoFilters): LeadRow[] {
  const useFaixa = filtros.faixaTemporal !== 'custom';

  return filterDadosRows(rows, {
    dataInicial: useFaixa ? '' : filtros.dataInicial,
    dataFinal: useFaixa ? '' : filtros.dataFinal,
    empreendimento: filtros.empreendimento,
    origem: filtros.origem,
    dispositivo: '',
    canal: '',
    qualificacao: filtros.qualificacao,
    etapaAtual: filtros.etapaAtual,
  }).filter((row) => {
    if (
      useFaixa &&
      filtros.faixaTemporal !== 'custom' &&
      !matchesFaixaTemporal(row, filtros.faixaTemporal)
    ) {
      return false;
    }
    if (filtros.statusMaturacao && getMaturationStatus(row) !== filtros.statusMaturacao) {
      return false;
    }
    if (filtros.responsavel && (row.responsavel ?? '').trim() !== filtros.responsavel) {
      return false;
    }
    return true;
  });
}
