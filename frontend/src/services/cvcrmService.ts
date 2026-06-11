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

export type CvcrmSyncStatusResponse = {
  last_sync_at: string | null;
  last_processed: number;
};

export function formatCvcrmSyncStatusLabel(
  lastSyncAt: string | null,
  lastProcessed: number,
): string {
  if (!lastSyncAt) return 'Nunca sincronizado';
  const date = new Date(lastSyncAt);
  if (Number.isNaN(date.getTime())) return 'Nunca sincronizado';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const leadLabel =
    lastProcessed === 1 ? '1 lead atualizado' : `${lastProcessed} leads atualizados`;
  return `${leadLabel} às ${hh}h${mm}m`;
}

export const CVCRM_SYNC_STATUS_REFRESH_EVENT = 'cvcrm-sync-status-refresh';

export type CvcrmSyncNowResponse = {
  processed?: number;
  not_found?: number;
  errors?: number;
  total_baixados?: number;
  message?: string;
  skipped?: boolean;
};

export type CvcrmSyncAllResponse = {
  processed?: number;
  total_baixados?: number;
  errors?: number;
  message?: string;
  skipped?: boolean;
};

export const cvcrmService = {
  async getSyncStatus() {
    return apiFetch<CvcrmSyncStatusResponse>('/api/cvcrm/sync-status');
  },

  async getPendingCount() {
    return apiFetch<CvcrmPendingCountResponse>('/api/cvcrm/pending-count');
  },

  async syncNow() {
    return apiFetch<CvcrmSyncNowResponse>('/api/cvcrm/sync-now', { method: 'POST' });
  },

  async syncAll() {
    return apiFetch<CvcrmSyncAllResponse>('/api/cvcrm/sync-all', { method: 'POST' });
  },
};
