import { useEffect } from 'react';

const RELOAD_INTERVAL_MS = 5 * 1000; // 5 segundos

/**
 * Recarrega a página a cada 5s apenas quando a aba está em segundo plano,
 * para atualizar funcionalidades sem impacto visual para o usuário.
 */
export function useSilentReload() {
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'hidden') {
        window.location.reload();
      }
    }, RELOAD_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
}
