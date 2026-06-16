/**
 * Title Case para nomes de pessoa no padrão pt-BR.
 *
 * Imobiliárias: `toTitleCaseImobiliaria` aplica Title Case + overrides por token (siglas/marcas).
 */

/** Conectores que permanecem minúsculos quando não são a primeira palavra. */
const CONNECTORS = new Set([
  'de',
  'do',
  'da',
  'dos',
  'das',
  'e',
  'di',
  'du',
  'em',
  'no',
  'na',
  'ao',
  'aos',
]);

/**
 * Overrides por token (palavra) para nomes de imobiliária — aplicados DEPOIS do Title Case.
 *
 * Chave = token em maiúsculas, sem pontuação (ex.: "Re/Max" → REMAX).
 * Valor = forma canônica de exibição.
 *
 * Como adicionar: inclua a sigla/marca abaixo e rode
 * `node backend/scripts/backfill-cadastros-title-case.mjs`.
 */
export const IMOBILIARIA_TOKEN_OVERRIDES = Object.freeze({
  GL: 'GL',
  JJ: 'JJ',
  PJ: 'PJ',
  RC: 'RC',
  SC: 'SC',
  SD: 'SD',
  WC: 'WC',
  MD: 'MD',
  PPV: 'PPV',
  VRS: 'VRS',
  GTF: 'GTF',
  MCE: 'MCE',
  TDG: 'TDG',
  XP: 'XP',
  REMAX: 'RE/MAX',
});

const HTML_ENTITY_MAP = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

/** Decodifica entidades HTML comuns antes de qualquer normalização. */
export function decodeHtmlEntities(str) {
  if (str == null) return null;
  let out = String(str);
  for (const [entity, char] of Object.entries(HTML_ENTITY_MAP)) {
    out = out.split(entity).join(char);
  }
  return out;
}

function capitalizeSegment(segment) {
  if (!segment) return segment;
  return segment.charAt(0).toLocaleUpperCase('pt-BR') + segment.slice(1);
}

/** Capitaliza cada parte separada por hífen ou apóstrofo (d'avila → D'Avila). */
function titleCaseToken(token) {
  const parts = token.split(/(['-])/);
  return parts
    .map((part, index) => {
      if (part === "'" || part === '-') return part;
      const prev = parts[index - 1];
      if (index === 0 || prev === "'" || prev === '-') {
        return capitalizeSegment(part);
      }
      return part;
    })
    .join('');
}

function tokenOverrideKey(token) {
  return token.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function applyImobiliariaTokenOverrides(titleCased) {
  return titleCased
    .split(' ')
    .map((word) => {
      const key = tokenOverrideKey(word);
      if (key && Object.prototype.hasOwnProperty.call(IMOBILIARIA_TOKEN_OVERRIDES, key)) {
        return IMOBILIARIA_TOKEN_OVERRIDES[key];
      }
      return word;
    })
    .join(' ');
}

/**
 * @param {string | null | undefined} str
 * @returns {string | null}
 */
export function toTitleCasePtBr(str) {
  if (str == null) return null;
  const decoded = decodeHtmlEntities(str);
  const collapsed = decoded.trim().replace(/\s+/g, ' ');
  if (!collapsed) return null;

  const lower = collapsed.toLocaleLowerCase('pt-BR');
  const words = lower.split(' ');

  return words
    .map((word, index) => {
      if (index > 0 && CONNECTORS.has(word)) return word;
      return titleCaseToken(word);
    })
    .join(' ');
}

/**
 * Nome de imobiliária: decode HTML → Title Case → overrides por token.
 * @param {string | null | undefined} str
 * @returns {string | null}
 */
export function toTitleCaseImobiliaria(str) {
  if (str == null) return null;
  const decoded = decodeHtmlEntities(str);
  const collapsed = decoded.trim().replace(/\s+/g, ' ');
  if (!collapsed) return null;

  const titleCased = toTitleCasePtBr(collapsed);
  if (!titleCased) return null;

  return applyImobiliariaTokenOverrides(titleCased);
}
