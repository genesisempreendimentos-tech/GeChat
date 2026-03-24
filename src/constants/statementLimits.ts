/** Limites de comunicados e comentários (alinhados à validação no serviço e na base de dados). */

export const MAX_STATEMENT_TITLE_LENGTH = 100;
export const MAX_STATEMENT_CAPTION_LENGTH = 3000;
export const MAX_COMMENT_CONTENT_LENGTH = 1000;
export const MAX_COMMENTS_PER_STATEMENT = 200;

export const statementLimitMessages = {
  titleExceeded: `O título pode ter no máximo ${MAX_STATEMENT_TITLE_LENGTH} caracteres.`,
  captionExceeded: `A legenda pode ter no máximo ${MAX_STATEMENT_CAPTION_LENGTH} caracteres.`,
  commentExceeded: `O comentário pode ter no máximo ${MAX_COMMENT_CONTENT_LENGTH} caracteres.`,
  /** Texto genérico — o limite numérico continua aplicado só no backend/validação. */
  commentCountExceeded: 'Este comunicado já atingiu o limite de comentários.',
} as const;

export function validateStatementTitle(title: string): string | null {
  if (title.length > MAX_STATEMENT_TITLE_LENGTH) return statementLimitMessages.titleExceeded;
  return null;
}

export function validateStatementCaption(caption: string | null | undefined): string | null {
  const len = (caption ?? '').length;
  if (len > MAX_STATEMENT_CAPTION_LENGTH) return statementLimitMessages.captionExceeded;
  return null;
}

/** Conteúdo já normalizado (ex.: trim aplicado no serviço). */
export function validateCommentContentTrimmed(content: string): string | null {
  if (!content) return null;
  if (content.length > MAX_COMMENT_CONTENT_LENGTH) return statementLimitMessages.commentExceeded;
  return null;
}
