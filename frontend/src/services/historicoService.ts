import type { HistoricoFilters, HistoricoListResponse } from '@/types/historico';

async function apiFetch<T>(path: string): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        data: null,
        error: (payload as { error?: string })?.error ?? 'Não foi possível carregar o histórico.',
      };
    }
    return { data: payload as T, error: null };
  } catch {
    return { data: null, error: 'Falha de conexão.' };
  }
}

export function buildHistoricoUrl(filters: HistoricoFilters, page: number, limit = 50): string {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (filters.tipos.length) params.set('tipos', filters.tipos.join(','));
  if (filters.empreendimento.trim()) params.set('empreendimento', filters.empreendimento.trim());
  if (filters.data_de) params.set('data_de', filters.data_de);
  if (filters.data_ate) params.set('data_ate', filters.data_ate);
  if (filters.busca.trim()) params.set('busca', filters.busca.trim());
  return `/api/historico?${params.toString()}`;
}

export async function fetchHistorico(filters: HistoricoFilters, page: number, limit = 50) {
  return apiFetch<HistoricoListResponse>(buildHistoricoUrl(filters, page, limit));
}
