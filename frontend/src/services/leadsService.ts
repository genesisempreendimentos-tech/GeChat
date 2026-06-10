import type { Lead, LeadStats, LeadStatus } from '@/types/lead';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<{ data: T | null; error: any }> {
  try {
    const response = await fetch(path, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { data: null, error: payload?.error ?? 'Erro na API.' };
    }
    return { data: payload as T, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export const leadsService = {
  async list(status?: LeadStatus) {
    const { data, error } = await apiFetch<{ leads: Lead[] }>(`/api/leads?status=${status || ''}`);
    return { data: data?.leads ?? [], error };
  },

  async getStats() {
    const { data, error } = await apiFetch<LeadStats>(`/api/leads/stats`);
    return { data, error };
  },

  async getById(id: string) {
    const { data, error } = await apiFetch<{ lead: Lead }>(`/api/leads/${id}`);
    return { data: data?.lead ?? null, error };
  },

  async sync() {
    return apiFetch<{ synced: number; sources: { source: string; table: string; count: number }[] }>(
      '/api/leads/sync',
      { method: 'POST' },
    );
  },
};
