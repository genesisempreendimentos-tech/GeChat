/** Disparado após alterar favoritos — atualiza a lista na sidebar sem esperar troca de rota. */
export const FAVORITES_CHANGED_EVENT = 'ui-shell:favorites-changed';

export function emitFavoritesChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
}
