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
  const timeStr = date.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const [hh = '00', mm = '00'] = timeStr.split(':');
  const leadLabel =
    lastProcessed === 1 ? '1 lead atualizado' : `${lastProcessed} leads atualizados`;
  return `${leadLabel} às ${hh}h${mm}m`;
}

export type CvcrmLeadUpdateChange = {
  de: string | boolean | null;
  para: string | boolean | null;
};

export type CvcrmLeadUpdateRow = {
  id: number;
  idlead: number;
  cvcrm_lead_id: string | null;
  lead_name: string | null;
  source_table: string | null;
  action: string;
  changes: Record<string, CvcrmLeadUpdateChange>;
  synced_at: string | null;
};

export type CvcrmLeadUpdatesResponse = {
  updates: CvcrmLeadUpdateRow[];
};

export function formatCvcrmUpdateSyncedAt(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatAuditFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    cvcrm_situation: 'Situação',
    cvcrm_status: 'Status',
    cvcrm_stage: 'Estágio',
    cvcrm_is_sold: 'Vendido',
    documento_cliente: 'Documento',
    cvcrm_last_update: 'Última alteração CVCRM',
    idsituacao: 'ID situação',
  };
  return labels[field] ?? field;
}

export function formatAuditValue(value: string | boolean | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return String(value);
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

export type CvcrmSyncIncrementalResponse = {
  processed?: number;
  reservas_processed?: number;
  errors?: number;
  leads_updated_from_reservas?: number;
  attribution_updated?: number;
  leads_consolidated?: number;
  sweep48h?: boolean;
  run_start?: string;
  message?: string;
  skipped?: boolean;
  leads?: {
    processed?: number;
    errors?: number;
    total_baixados?: number;
    since_brt?: string;
    cursor_before?: string | null;
    cursor_after?: string;
  };
  reservas?: {
    processed?: number;
    errors?: number;
    total_baixados?: number;
    since_brt?: string;
    cursor_before?: string | null;
    cursor_after?: string;
  };
  cursors?: {
    leads: string | null;
    reservas: string | null;
  };
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

  async syncIncremental(options?: { skipIfRecent?: boolean }) {
    return apiFetch<CvcrmSyncIncrementalResponse>('/api/cvcrm/sync-incremental', {
      method: 'POST',
      body: JSON.stringify({ skipIfRecent: options?.skipIfRecent === true }),
    });
  },

  async syncAll() {
    return apiFetch<CvcrmSyncAllResponse>('/api/cvcrm/sync-all', { method: 'POST' });
  },

  async listUpdates(limit = 100, offset = 0) {
    return apiFetch<CvcrmLeadUpdatesResponse>(
      `/api/cvcrm/updates?limit=${limit}&offset=${offset}`,
    );
  },
};
