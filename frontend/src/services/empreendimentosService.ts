import type {
  EmpreendimentoAliasCluster,
  EmpreendimentoAliasListItem,
  EmpreendimentoAliasStats,
  EmpreendimentoGenesis,
  EmpreendimentoGenesisDetail,
  EmpreendimentosAnalyticsData,
  EmpreendimentosDateRange,
  EmpreendimentoSavePayload,
} from '@/types/empreendimentos';

export type EmpreendimentosApiDateQuery = {
  from?: string;
  to?: string;
};

function empreendimentosDateQuery(dateRange?: EmpreendimentosDateRange): EmpreendimentosApiDateQuery {
  if (!dateRange?.from?.trim() || !dateRange?.to?.trim()) return {};
  return {
    from: dateRange.from.trim(),
    to: dateRange.to.trim(),
  };
}

function buildEmpreendimentosUrl(path: string, dateRange?: EmpreendimentosDateRange): string {
  const params = new URLSearchParams();
  const dateQuery = empreendimentosDateQuery(dateRange);
  if (dateQuery.from) params.set('from', dateQuery.from);
  if (dateQuery.to) params.set('to', dateQuery.to);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

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

export async function fetchUserEmpreendimentos(dateRange?: EmpreendimentosDateRange) {
  return apiFetch<{ empreendimentos: EmpreendimentoGenesis[] }>(
    buildEmpreendimentosUrl('/api/empreendimentos', dateRange),
  );
}

export async function fetchEmpreendimentosAnalytics(
  isAdmin = false,
  dateRange?: EmpreendimentosDateRange,
) {
  const base = isAdmin ? '/api/admin/empreendimentos/analytics' : '/api/empreendimentos/analytics';
  return apiFetch<EmpreendimentosAnalyticsData>(buildEmpreendimentosUrl(base, dateRange));
}

export async function fetchAdminEmpreendimentos(dateRange?: EmpreendimentosDateRange) {
  return apiFetch<{ empreendimentos: EmpreendimentoGenesis[]; stats: EmpreendimentoAliasStats }>(
    buildEmpreendimentosUrl('/api/admin/empreendimentos', dateRange),
  );
}

export async function fetchAdminEmpreendimentoDetail(id: number) {
  return apiFetch<EmpreendimentoGenesisDetail>(`/api/admin/empreendimentos/${id}`);
}

export async function fetchEmpreendimentoMappedAliases(id: number, isAdmin = false) {
  if (isAdmin) {
    const result = await fetchAdminEmpreendimentoDetail(id);
    if (result.error || !result.data) {
      return { data: null, error: result.error };
    }
    return {
      data: {
        id: result.data.id,
        nome: result.data.nome,
        aliases: result.data.aliases,
      },
      error: null,
    };
  }
  return apiFetch<{ id: number; nome: string; aliases: EmpreendimentoGenesisDetail['aliases'] }>(
    `/api/empreendimentos/${id}/aliases`,
  );
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

