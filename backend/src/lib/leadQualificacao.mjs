/**
 * Qualificação de marketing (Indefinida/N/A/Baixa/Média/Alta).
 * Porte de frontend/src/rules/qualifyLead.ts — NÃO é situação do funil CV.
 */

function textOrNull(value) {
  if (value == null) return null;
  const t = String(value).trim();
  return t || null;
}

function formatBirthDatePtBr(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    const day = String(value.getUTCDate()).padStart(2, '0');
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const year = value.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return s || null;
}

export function leadRespondeuFormularioPerfil(row) {
  return Boolean(
    textOrNull(row.relacionamento) &&
      textOrNull(row.investimento) &&
      textOrNull(row.cidade) &&
      formatBirthDatePtBr(row.birth_date) &&
      textOrNull(row.perfil_tipo),
  );
}

/** @returns {'Indefinida'|'N/A'|'Baixa'|'Média'|'Alta'} */
export function computeLeadQualificacao(row) {
  const email = textOrNull(row.email);
  const telefone = textOrNull(row.telefone);
  const hasContact = Boolean(email || telefone);
  if (!hasContact) return 'N/A';

  if (!leadRespondeuFormularioPerfil(row)) return 'Indefinida';

  const inv = textOrNull(row.investimento) ?? '';
  if (inv === 'Acima de R$3500') return 'Alta';
  if (inv === 'Entre R$2501 e R$3500') return 'Média';
  if (inv === 'Entre R$1701 e R$2500') return 'Média';
  if (inv === 'Entre R$1000 e R$1700') return 'Baixa';
  return 'Indefinida';
}

export const QUALIFICACAO_ORDER = {
  'N/A': 0,
  Indefinida: 1,
  Baixa: 2,
  Média: 3,
  Alta: 4,
};
