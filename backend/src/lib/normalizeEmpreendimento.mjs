/**
 * Normalização de empreendimento_interesse para valor_norm (ingest + resolução read-time).
 */

const NAO_INFORMADO_EXACT = new Set([
  'nao sei',
  'nao sei quero ajuda para escolher',
  'outros',
  'outro',
  'nao informado',
  'n a',
  'na',
  'não sei',
  'não informado',
]);

const NAO_INFORMADO_JUNK = new Set([
  'apartamento 2 quartos',
  'genesis site',
  'teste',
  'test',
  'site genesis',
  'sem interesse',
  'nao tenho interesse',
]);

const NAO_INFORMADO_PREFIXES = [
  'apartamento ',
  'casa ',
  'lote ',
  'terreno ',
];

/** lower → sem acento → trim → colapsa espaço → [_-]→espaço → remove pontuação */
export function normalizeEmpreendimento(raw) {
  if (raw == null) return '';
  let text = String(raw)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

/** Quebra multi-seleção por ';' e retorna partes crus (trim, não vazias). */
export function splitEmpreendimentoInteresse(raw) {
  if (raw == null) return [];
  const text = String(raw).trim();
  if (!text) return [];
  return text
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Classifica alias para ingestão.
 * @returns {'a_classificar'|'nao_informado'}
 */
export function classifyAliasStatus(valorNorm, exemploCru = '') {
  const norm = valorNorm || normalizeEmpreendimento(exemploCru);
  if (!norm) return 'nao_informado';

  if (NAO_INFORMADO_EXACT.has(norm)) return 'nao_informado';
  if (NAO_INFORMADO_JUNK.has(norm)) return 'nao_informado';

  for (const prefix of NAO_INFORMADO_PREFIXES) {
    if (norm.startsWith(prefix)) return 'nao_informado';
  }

  const rawLower = String(exemploCru ?? '').trim().toLowerCase();
  if (rawLower.includes('quero ajuda para escolher')) return 'nao_informado';

  return 'a_classificar';
}

/** Extrai pares { valorNorm, exemploCru } de um valor bruto (com split por ';'). */
export function extractEmpreendimentoParts(raw) {
  const parts = splitEmpreendimentoInteresse(raw);
  if (!parts.length) {
    const norm = normalizeEmpreendimento(raw);
    if (!norm) return [];
    return [{ valorNorm: norm, exemploCru: String(raw ?? '').trim() || norm }];
  }
  return parts.map((part) => ({
    valorNorm: normalizeEmpreendimento(part),
    exemploCru: part,
  })).filter((p) => p.valorNorm);
}
