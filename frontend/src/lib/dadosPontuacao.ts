import type { LeadsInfoboxStats, LeadMetricsRow } from '@/lib/leadsMetrics';
import { leadRespondeuFormularioPerfil } from '@/rules/qualifyLead';

export type PontuacaoStatus = 'Bom' | 'Regular' | 'Atenção';

export type PontuacaoFatorIcon =
  | 'trending-up'
  | 'bar-chart-3'
  | 'inbox'
  | 'circle-help'
  | 'trending-down'
  | 'star'
  | 'file-text'
  | 'home'
  | 'dollar-sign'
  | 'circle-check';

export type PontuacaoFator = {
  id: string;
  text: string;
  icon: PontuacaoFatorIcon;
};

export type PontuacaoDiagnostico = {
  score: number;
  status: PontuacaoStatus;
  fatores: PontuacaoFator[];
};

function pontuacaoStatus(score: number): PontuacaoStatus {
  if (score >= 65) return 'Bom';
  if (score >= 40) return 'Regular';
  return 'Atenção';
}

function fator(id: string, text: string, icon: PontuacaoFatorIcon): PontuacaoFator {
  return { id, text, icon };
}

export function buildPontuacaoDiagnostico(
  rows: LeadMetricsRow[],
  stats: LeadsInfoboxStats,
): PontuacaoDiagnostico {
  const fatores: PontuacaoFator[] = [];
  const { leads, qualificados, visitasAgendadas, analiseCredito, vendas } = stats;

  if (leads >= 100) {
    fatores.push(fator('volume-alto', 'Bom volume de leads', 'trending-up'));
  } else if (leads > 0) {
    fatores.push(fator('volume-moderado', 'Volume de leads moderado', 'bar-chart-3'));
  } else {
    fatores.push(fator('sem-leads', 'Sem leads no período', 'inbox'));
  }

  const indefinidos = rows.filter((r) => r.qualificacao === 'Indefinida').length;
  if (leads > 0 && indefinidos / leads > 0.5) {
    fatores.push(fator('sem-qualificacao', 'Muitos leads sem qualificação', 'circle-help'));
  } else if (leads > 0 && qualificados / leads < 0.15) {
    fatores.push(fator('baixa-qualificacao', 'Baixa taxa de leads qualificados', 'trending-down'));
  } else if (qualificados > 0) {
    fatores.push(fator('qualificados', 'Parte dos leads foi qualificada', 'star'));
  }

  const conversoes = rows.filter((r) => leadRespondeuFormularioPerfil(r)).length;
  if (leads > 0 && conversoes / leads < 0.2) {
    fatores.push(fator('perfil-incompleto', 'Poucos leads com perfil completo', 'file-text'));
  }

  if (visitasAgendadas > 0 && analiseCredito === 0) {
    fatores.push(fator('pos-visita', 'Baixo avanço após visitas', 'home'));
  }

  if (vendas === 0 && leads > 0) {
    fatores.push(fator('sem-vendas', 'Vendas não registradas no período', 'dollar-sign'));
  } else if (vendas > 0) {
    fatores.push(fator('com-vendas', 'Há vendas registradas no período', 'circle-check'));
  }

  return {
    score: stats.pontuacao,
    status: pontuacaoStatus(stats.pontuacao),
    fatores: fatores.slice(0, 4),
  };
}

export const PONTUACAO_STATUS_COLORS: Record<PontuacaoStatus, string> = {
  Bom: 'text-emerald-600 dark:text-emerald-400',
  Regular: 'text-amber-600 dark:text-amber-400',
  Atenção: 'text-red-600 dark:text-red-400',
};

export const PONTUACAO_STATUS_EMOJI: Record<PontuacaoStatus, string> = {
  Bom: '🔥',
  Regular: '👍',
  Atenção: '⚠️',
};
