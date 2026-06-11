async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<{ data: T | null; error: unknown }> {
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
      return { data: null, error: (payload as { error?: string })?.error ?? 'Erro na API.' };
    }
    return { data: payload as T, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export type CvcrmPendingCountResponse = {
  pending: number;
};

export type CvcrmSyncNowResponse = {
  processed?: number;
  not_found?: number;
  errors?: number;
  total_baixados?: number;
  message?: string;
  skipped?: boolean;
};

export const cvcrmService = {
  async getPendingCount() {
    return apiFetch<CvcrmPendingCountResponse>('/api/cvcrm/pending-count');
  },

  async syncNow() {
    return apiFetch<CvcrmSyncNowResponse>('/api/cvcrm/sync-now', { method: 'POST' });
  },
};
