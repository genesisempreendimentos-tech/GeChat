import { subDays, startOfYear, format } from 'date-fns';
import type {
  LeadsBignumbersData,
  LeadsChartsBlock,
  LeadsListQuery,
  LeadsListResponse,
  LeadsOverviewQuery,
  LeadsOverviewResponse,
  LeadsPanelFilters,
  LeadsPeriodoPreset,
} from '@/types/leadsOverview';
import { normalizeLeadsListResponse } from '@/lib/normalizeLeadsListRow';

export type LeadsApiQueryParams = {
  created_de?: string;
  created_ate?: string;
  canal?: string;
  fonte?: string;
  empreendimento?: string;
  situacao_cv?: string;
  timeline_grain?: string;
  section?: string;
  busca?: string;
  page?: string;
  pageSize?: string;
};

function resolvePeriodDates(periodo: LeadsPeriodoPreset): Pick<LeadsApiQueryParams, 'created_de' | 'created_ate'> {
  if (periodo === 'todos') return {};
  const today = new Date();
  const ate = format(today, 'yyyy-MM-dd');
  if (periodo === '30d') {
    return { created_de: format(subDays(today, 30), 'yyyy-MM-dd'), created_ate: ate };
  }
  if (periodo === '90d') {
    return { created_de: format(subDays(today, 90), 'yyyy-MM-dd'), created_ate: ate };
  }
  if (periodo === '12m') {
    return { created_de: format(subDays(today, 365), 'yyyy-MM-dd'), created_ate: ate };
  }
  if (periodo === 'ytd') {
    return { created_de: format(startOfYear(today), 'yyyy-MM-dd'), created_ate: ate };
  }
  return {};
}

export function filtersToLeadsQuery(
  filters: LeadsPanelFilters | LeadsOverviewQuery,
  extra?: Partial<LeadsApiQueryParams>,
): LeadsApiQueryParams {
  const params: LeadsApiQueryParams = {
    ...extra,
  };

  if (filters.created_de?.trim() && filters.created_ate?.trim()) {
    params.created_de = filters.created_de.trim();
    params.created_ate = filters.created_ate.trim();
  } else {
    Object.assign(params, resolvePeriodDates(filters.periodo));
  }
  if (filters.canal?.trim()) params.canal = filters.canal.trim();
  if (filters.fonte && filters.fonte !== 'todos') params.fonte = filters.fonte;
  if (filters.empreendimento?.trim()) params.empreendimento = filters.empreendimento.trim();
  if (filters.situacao_cv?.trim()) params.situacao_cv = filters.situacao_cv.trim();
  if ('busca' in filters && filters.busca?.trim()) params.busca = filters.busca.trim();
  return params;
}

function buildUrl(path: string, params: LeadsApiQueryParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

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
        error: (payload as { error?: string })?.error ?? 'Não foi possível carregar os dados de leads.',
      };
    }
    return { data: payload as T, error: null };
  } catch {
    return { data: null, error: 'Falha de conexão. Verifique sua internet e tente novamente.' };
  }
}

export function buildLeadsOverviewUrl(
  query: LeadsOverviewQuery,
  section?: 'bignumbers' | 'charts',
): string {
  return buildUrl(
    '/api/leads/overview',
    filtersToLeadsQuery(query, {
      timeline_grain: query.timeline_grain,
      ...(section ? { section } : {}),
    }),
  );
}

export function buildLeadsListUrl(query: LeadsListQuery): string {
  return buildUrl(
    '/api/leads/list',
    filtersToLeadsQuery(query, {
      page: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 25),
    }),
  );
}

export async function fetchLeadsOverviewBignumbers(query: LeadsOverviewQuery) {
  return apiFetch<LeadsBignumbersData>(buildLeadsOverviewUrl(query, 'bignumbers'));
}

export async function fetchLeadsOverviewCharts(query: LeadsOverviewQuery) {
  return apiFetch<LeadsChartsBlock>(buildLeadsOverviewUrl(query, 'charts'));
}

export async function fetchLeadsOverview(query: LeadsOverviewQuery) {
  return apiFetch<LeadsOverviewResponse>(buildLeadsOverviewUrl(query));
}

export async function fetchLeadsList(query: LeadsListQuery) {
  const result = await apiFetch<LeadsListResponse>(buildLeadsListUrl(query));
  if (!result.data) return result;
  return {
    data: normalizeLeadsListResponse(result.data),
    error: null,
  };
}

export function leadsOverviewIsEmpty(data: LeadsOverviewResponse): boolean {
  return data.bignumbers.leads_unicos.count === 0;
}
