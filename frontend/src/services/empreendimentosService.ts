import type {
  EmpreendimentoAliasCluster,
  EmpreendimentoAliasListItem,
  EmpreendimentoAliasStats,
  EmpreendimentoGenesis,
  EmpreendimentoGenesisDetail,
  EmpreendimentosAnalyticsData,
  EmpreendimentoSavePayload,
} from '@/types/empreendimentos';

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(path, {
      credentials: 'include',
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        data: null,
        error: (payload as { error?: string })?.error ?? 'Não foi possível completar a operação.',
      };
    }
    return { data: payload as T, error: null };
  } catch {
    return { data: null, error: 'Falha de conexão.' };
  }
}

export async function fetchUserEmpreendimentos() {
  return apiFetch<{ empreendimentos: EmpreendimentoGenesis[] }>('/api/empreendimentos');
}

export async function fetchEmpreendimentosAnalytics(isAdmin = false) {
  const path = isAdmin ? '/api/admin/empreendimentos/analytics' : '/api/empreendimentos/analytics';
  return apiFetch<EmpreendimentosAnalyticsData>(path);
}

export async function fetchAdminEmpreendimentos() {
  return apiFetch<{ empreendimentos: EmpreendimentoGenesis[]; stats: EmpreendimentoAliasStats }>(
    '/api/admin/empreendimentos',
  );
}

export async function fetchAdminEmpreendimentoDetail(id: number) {
  return apiFetch<EmpreendimentoGenesisDetail>(`/api/admin/empreendimentos/${id}`);
}

export async function fetchAdminAliasClusters(status: 'a_classificar' = 'a_classificar') {
  return apiFetch<{ clusters: EmpreendimentoAliasCluster[]; stats: EmpreendimentoAliasStats }>(
    `/api/admin/empreendimentos/aliases?status=${status}`,
  );
}

export async function fetchAdminAllAliases() {
  return apiFetch<{ aliases: EmpreendimentoAliasListItem[]; stats: EmpreendimentoAliasStats }>(
    '/api/admin/empreendimentos/aliases/all',
  );
}

export async function createEmpreendimento(payload: EmpreendimentoSavePayload) {
  return apiFetch<EmpreendimentoGenesis>('/api/admin/empreendimentos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateEmpreendimento(id: number, payload: EmpreendimentoSavePayload) {
  return apiFetch<EmpreendimentoGenesis>(`/api/admin/empreendimentos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function uploadEmpreendimentoLogo(file: File) {
  const form = new FormData();
  form.append('file', file);
  const backend = await apiFetch<{ url: string }>('/api/admin/empreendimentos/logo', {
    method: 'POST',
    body: form,
  });
  if (backend.data?.url) return { url: backend.data.url, error: null };
  return { url: null, error: backend.error ?? 'Falha no upload do logo.' };
}

