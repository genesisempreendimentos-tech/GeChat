import type { NotificacoesResponse } from '@/types/historico';

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        data: null,
        error: (payload as { error?: string })?.error ?? 'Erro ao carregar notificações.',
      };
    }
    return { data: payload as T, error: null };
  } catch {
    return { data: null, error: 'Falha de conexão.' };
  }
}

export async function fetchNotificacoes(limit = 20) {
  return apiFetch<NotificacoesResponse>(`/api/notificacoes?limit=${limit}`);
}

export async function marcarNotificacoesLidas() {
  return apiFetch<{ ultima_leitura_em: string }>('/api/notificacoes/marcar-lida', {
    method: 'POST',
  });
}
