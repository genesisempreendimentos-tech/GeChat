import { subDays, subMonths, format } from 'date-fns';
import { filterDadosRows, type DadosFilterOptions } from '@/lib/dadosFilters';
import { getLeadEtapaAtual, type LeadEtapaComercial } from '@/lib/leadStage';
import { resolveEmpreendimentoPagina } from '@/lib/leadEmpreendimento';
import type { LeadRow } from '@/lib/leadRow';
import { getMaturationStatus, type MaturationStatus } from '@/lib/dadosMaturacao';

export type MaturacaoPeriodoRapido = '7d' | '30d' | '3m' | '6m' | '12m' | 'custom';

export type MaturacaoFilters = {
  dataInicial: string;
  dataFinal: string;
  periodoRapido: MaturacaoPeriodoRapido;
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

export const MATURACAO_PERIODO_RAPIDO_OPTIONS: { value: MaturacaoPeriodoRapido; label: string }[] = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '3m', label: '3 meses' },
  { value: '6m', label: '6 meses' },
  { value: '12m', label: '12 meses' },
  { value: 'custom', label: 'Personalizado' },
];

function formatDateInput(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function periodoRapidoToRange(rapido: MaturacaoPeriodoRapido): { from: string; to: string } {
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

export function defaultMaturacaoFilters(): MaturacaoFilters {
  const { from, to } = periodoRapidoToRange('3m');
  return {
    dataInicial: from,
    dataFinal: to,
    periodoRapido: '3m',
    empreendimento: '',
    origem: '',
    etapaAtual: '',
    qualificacao: '',
    statusMaturacao: '',
    responsavel: '',
  };
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
    if (filtros.statusMaturacao && getMaturationStatus(row) !== filtros.statusMaturacao) {
      return false;
    }
    if (filtros.responsavel && (row.responsavel ?? '').trim() !== filtros.responsavel) {
      return false;
    }
    return true;
  });
}
