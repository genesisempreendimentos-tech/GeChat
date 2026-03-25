/** Alinhado à aba Aplicativos: lista vem de getSystemsForMember; aqui excluímos só rascunho e arquivado. */
export function isAppEligibleForFavoriteShortcut(status?: string | null): boolean {
  const s = (status ?? '').trim().toLowerCase();
  return s !== 'rascunho' && s !== 'arquivado';
}
