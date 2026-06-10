import { filterRowsByBalancoRange, getLeadsBalancoRanges } from '@/lib/leadsBalanco';
import { resolveEmpreendimentoLabel, resolveEmpreendimentoPagina } from '@/lib/leadEmpreendimento';
import type { LeadsBalancoMode, LeadMetricaFiltro } from '@/lib/leadsControlLine';
import {
  leadRespondeuFormularioPerfil,
  type LeadQualificacao,
} from '@/rules/qualifyLead';

export type LeadMetricsRow = {
  dataHora: string;
  contato: string;
  origem: string;
  pagina: string;
  empreendimento?: string;
  _table?: string;
  qualificacao: LeadQualificacao;
  dispositivo?: string;
  relacionamento?: string;
  investimento?: string;
  cidadeResidencia?: string;
  dataNascimento?: string;
  perfilLead?: string;
  pagamentoPreferencia?: string;
  cvcrm_lead_id?: string | null;
  cvcrm_sync_status?: string | null;
  cvcrm_is_sold?: boolean;
  cvcrm_status?: string | null;
  cvcrm_situation?: string | null;
  cvcrm_stage?: string | null;
};

export type LeadsInfoboxStats = {
  leads: number;
  forms: number;
  whatsapp: number;
  taxaConversaoPct: number;
  pontuacao: number;
  vendas: number;
  sincronizados: number;
  visitasAgendadas: number;
  atendimentoCorretor: number;
  analiseCredito: number;
};

export type LeadsPaginaDerivedRow = {
  id: string;
  nome: string;
  leads: number;
  ultimoLeadIso: string;
  perfilPct: number;
  qualificacaoPct: number;
};

function contatoIsForm(contato: string) {
  return contato.includes('@');
}

function contatoIsWhatsapp(contato: string) {
  return !contatoIsForm(contato);
}

function isAtendimentoCorretor(row: LeadMetricsRow) {
  return leadRespondeuFormularioPerfil(row) && row.qualificacao === 'Média';
}

function isVisitaAgendada(row: LeadMetricsRow) {
  return leadRespondeuFormularioPerfil(row) && row.qualificacao === 'Alta';
}

function isVendaLead(row: LeadMetricsRow) {
  return row.cvcrm_is_sold === true;
}

function isSincronizadoLead(row: LeadMetricsRow) {
  return row.cvcrm_sync_status === 'synced';
}

function isTaxaConversaoLead(row: LeadMetricsRow) {
  return leadRespondeuFormularioPerfil(row);
}

function isPontuacaoLead(row: LeadMetricsRow) {
  return leadRespondeuFormularioPerfil(row) && row.qualificacao !== 'Indefinida';
}

function isAnaliseCreditoLead(row: LeadMetricsRow) {
  if (!leadRespondeuFormularioPerfil(row)) return false;
  const pref = row.pagamentoPreferencia?.trim().toLowerCase() ?? '';
  return (
    pref.includes('financiamento') ||
    pref.includes('cartão') ||
    pref.includes('cartao') ||
    pref.includes('parcelado')
  );
}

export function getOrigemDominante(rows: LeadMetricsRow[]): string {
  if (!rows.length) return '—';
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.origem, (counts.get(row.origem) ?? 0) + 1);
  }
  let top = '—';
  let max = 0;
  for (const [origem, count] of counts) {
    if (count > max) {
      max = count;
      top = origem;
    }
  }
  return top;
}

export function getLeadsBalancoScopedRows<T extends LeadMetricsRow>(
  rows: T[],
  balanco: LeadsBalancoMode,
): T[] {
  const ranges = getLeadsBalancoRanges(balanco);
  if (!ranges) return rows;
  return filterRowsByBalancoRange(rows, ranges.current, (row) => row.dataHora);
}

export function filterLeadsByMetrica<T extends LeadMetricsRow>(
  rows: T[],
  metrica: LeadMetricaFiltro,
): T[] {
  switch (metrica) {
    case 'todos':
    case 'leads':
      return rows;
    case 'forms':
      return rows.filter((row) => contatoIsForm(row.contato));
    case 'whatsapp':
      return rows.filter((row) => contatoIsWhatsapp(row.contato));
    case 'taxa_conversao':
      return rows.filter(isTaxaConversaoLead);
    case 'pontuacao':
      return rows.filter(isPontuacaoLead);
    case 'vendas':
      return rows.filter(isVendaLead);
    case 'atendimento_corretor':
      return rows.filter(isAtendimentoCorretor);
    case 'visitas_agendadas':
      return rows.filter(isVisitaAgendada);
    case 'analise_credito':
      return rows.filter(isAnaliseCreditoLead);
    default:
      return rows;
  }
}

function computeTaxaConversaoPct(rows: LeadMetricsRow[]): number {
  if (!rows.length) return 0;
  const converted = rows.filter(isTaxaConversaoLead).length;
  return Math.round((converted / rows.length) * 1000) / 10;
}

/** Pontuação 0–100 de um lead conforme a classificação de qualificação. */
export const LEAD_QUALIFICACAO_PONTUACAO: Record<LeadQualificacao, number> = {
  Indefinida: 22,
  'N/A': 18,
  Baixa: 48,
  Média: 72,
  Alta: 91,
};

export function getLeadPontuacao(qualificacao: LeadQualificacao): number {
  return LEAD_QUALIFICACAO_PONTUACAO[qualificacao];
}

function computePontuacaoScore(rows: LeadMetricsRow[]): number {
  if (!rows.length) return 0;
  const sum = rows.reduce(
    (acc, row) => acc + (LEAD_QUALIFICACAO_PONTUACAO[row.qualificacao] ?? 30),
    0,
  );
  return Math.round(sum / rows.length);
}

export function computeLeadsInfoboxStats(rows: LeadMetricsRow[]): LeadsInfoboxStats {
  const forms = rows.filter((row) => contatoIsForm(row.contato)).length;
  const whatsapp = rows.filter((row) => contatoIsWhatsapp(row.contato)).length;

  return {
    leads: rows.length,
    forms,
    whatsapp,
    taxaConversaoPct: computeTaxaConversaoPct(rows),
    pontuacao: computePontuacaoScore(rows),
    vendas: rows.filter(isVendaLead).length,
    sincronizados: rows.filter(isSincronizadoLead).length,
    visitasAgendadas: rows.filter(isVisitaAgendada).length,
    atendimentoCorretor: rows.filter(isAtendimentoCorretor).length,
    analiseCredito: rows.filter(isAnaliseCreditoLead).length,
  };
}

export function computePaginasFromLeads(rows: LeadMetricsRow[]): LeadsPaginaDerivedRow[] {
  const byPage = new Map<string, LeadMetricsRow[]>();
  for (const row of rows) {
    const key = resolveEmpreendimentoPagina(row);
    const bucket = byPage.get(key) ?? [];
    bucket.push(row);
    byPage.set(key, bucket);
  }

  return Array.from(byPage.entries())
    .map(([paginaKey, pageRows]) => {
      const perfilComplete = pageRows.filter((row) => leadRespondeuFormularioPerfil(row)).length;
      const qualified = pageRows.filter(
        (row) => row.qualificacao === 'Alta' || row.qualificacao === 'Média',
      ).length;
      const ultimoLeadMs = pageRows.reduce(
        (max, row) => Math.max(max, new Date(row.dataHora).getTime()),
        0,
      );

      return {
        id: `pg-${paginaKey}`,
        nome: resolveEmpreendimentoLabel(pageRows[0] ?? { pagina: paginaKey }),
        leads: pageRows.length,
        ultimoLeadIso: new Date(ultimoLeadMs).toISOString(),
        perfilPct: pageRows.length ? Math.round((perfilComplete / pageRows.length) * 1000) / 10 : 0,
        qualificacaoPct: pageRows.length ? Math.round((qualified / pageRows.length) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.leads - a.leads);
}
