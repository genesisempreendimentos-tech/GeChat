/**
 * Valor canônico gravado quando empreendimento_interesse é NULL ou vazio no banco.
 */
export const EMPREENDIMENTO_INTERESSE_NULL_LABEL = 'Null';

/** NULL, vazio ou só espaços → 'Null'; caso contrário trim do texto original. */
export function materializeEmpreendimentoInteresse(raw) {
  if (raw == null) return EMPREENDIMENTO_INTERESSE_NULL_LABEL;
  const text = String(raw).trim();
  if (!text) return EMPREENDIMENTO_INTERESSE_NULL_LABEL;
  return text;
}

/** Expressão SQL: coluna TEXT → 'Null' quando NULL ou vazio. */
export function sqlCoalesceEmpreendimentoInteresse(columnExpr) {
  return `COALESCE(NULLIF(TRIM(${columnExpr}), ''), '${EMPREENDIMENTO_INTERESSE_NULL_LABEL}')`;
}
