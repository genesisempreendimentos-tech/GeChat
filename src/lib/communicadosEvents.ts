/** Disparado após marcar um comunicado como visto ou falhar revert — atualiza badge na sidebar. */
export const COMMUNICADOS_UNREAD_CHANGED_EVENT = 'ui-shell:communicados-unread-changed';

export function emitCommunicadosUnreadChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(COMMUNICADOS_UNREAD_CHANGED_EVENT));
}
