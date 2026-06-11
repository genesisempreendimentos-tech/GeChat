import type { QualidadeBreakdownRow } from '@/lib/dadosMaturacao';
import type { LeadRow } from '@/lib/leadRow';

export type QualidadeResumo = {
  total: number;
  alta: number;
  media: number;
  baixa: number;
  indefinida: number;
  qualificados: number;
  taxaQualificacao: number;
  taxaIndefinida: number;
};

function calcPct(part: number, total: number): number {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

export function computeQualidadeResumo(rows: LeadRow[]): QualidadeResumo {
  let alta = 0;
  let media = 0;
  let baixa = 0;
  let indefinida = 0;

  for (const row of rows) {
    switch (row.qualificacao) {
      case 'Alta':
        alta += 1;
        break;
      case 'Média':
        media += 1;
        break;
      case 'Baixa':
        baixa += 1;
        break;
      default:
        indefinida += 1;
    }
  }

  const total = rows.length;
  const qualificados = alta + media;

  return {
    total,
    alta,
    media,
    baixa,
    indefinida,
    qualificados,
    taxaQualificacao: calcPct(qualificados, total),
    taxaIndefinida: calcPct(indefinida, total),
  };
}

export function rowTotal(row: QualidadeBreakdownRow): number {
  return row.alta + row.media + row.baixa + row.indefinida;
}

export function rowTaxaQualificacao(row: QualidadeBreakdownRow): number {
  const total = rowTotal(row);
  return calcPct(row.alta + row.media, total);
}

export function buildQualidadeInsights(
  resumo: QualidadeResumo,
  porOrigem: QualidadeBreakdownRow[],
  porEmpreendimento: QualidadeBreakdownRow[],
): string[] {
  const insights: string[] = [];
  const formatPct = (value: number) =>
    `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

  if (resumo.taxaIndefinida >= 50) {
    insights.push(
      `${formatPct(resumo.taxaIndefinida)} dos leads estão sem qualificação. Revise formulários e integrações.`,
    );
  }

  if (resumo.taxaQualificacao >= 40) {
    insights.push(
      `${formatPct(resumo.taxaQualificacao)} dos leads são qualificados (alta ou média) — boa base para o comercial.`,
    );
  } else if (resumo.total >= 20) {
    insights.push(
      `Apenas ${formatPct(resumo.taxaQualificacao)} dos leads são qualificados. Vale revisar critérios e origem.`,
    );
  }

  const melhorOrigem = [...porOrigem]
    .filter((row) => rowTotal(row) >= 10)
    .sort((a, b) => rowTaxaQualificacao(b) - rowTaxaQualificacao(a))[0];
  if (melhorOrigem) {
    insights.push(
      `${melhorOrigem.grupo} traz a melhor taxa de qualificação entre origens com volume (${formatPct(rowTaxaQualificacao(melhorOrigem))}).`,
    );
  }

  const piorOrigem = [...porOrigem]
    .filter((row) => rowTotal(row) >= 10)
    .sort((a, b) => rowTaxaQualificacao(a) - rowTaxaQualificacao(b))[0];
  if (piorOrigem && rowTaxaQualificacao(piorOrigem) < 15) {
    insights.push(
      `${piorOrigem.grupo} concentra leads de baixa qualidade (${formatPct(rowTaxaQualificacao(piorOrigem))} qualificados).`,
    );
  }

  const melhorEmp = [...porEmpreendimento]
    .filter((row) => rowTotal(row) >= 10)
    .sort((a, b) => rowTaxaQualificacao(b) - rowTaxaQualificacao(a))[0];
  if (melhorEmp) {
    insights.push(
      `${melhorEmp.grupo} lidera em qualificação entre empreendimentos (${formatPct(rowTaxaQualificacao(melhorEmp))}).`,
    );
  }

  return insights.slice(0, 5);
}

export const QUALIDADE_NIVEL_INFO = [
  {
    nivel: 'Alta',
    cor: 'emerald' as const,
    descricao: 'Lead com perfil alinhado ao produto e maior propensão de avanço no funil.',
  },
  {
    nivel: 'Média',
    cor: 'blue' as const,
    descricao: 'Lead com potencial, mas que pode precisar de nutrição ou validação comercial.',
  },
  {
    nivel: 'Baixa',
    cor: 'amber' as const,
    descricao: 'Perfil distante do ideal ou sinal fraco de intenção de compra.',
  },
  {
    nivel: 'Indefinida',
    cor: 'muted' as const,
    descricao: 'Sem classificação registrada — reduz a confiança das comparações.',
  },
];
