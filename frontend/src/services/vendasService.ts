import type { VendasCompetenciaResponse } from '@/types/vendas';

export type VendasQueryParams = {
  data_venda_de?: string;
  data_venda_ate?: string;
  empreendimento?: string;
  imobiliaria?: string;
};

async function apiFetch<T>(
  path: string,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        data: null,
        error: (payload as { error?: string })?.error ?? 'Não foi possível carregar os dados de vendas.',
      };
    }
    return { data: payload as T, error: null };
  } catch {
    return {
      data: null,
      error: 'Falha de conexão. Verifique sua internet e tente novamente.',
    };
  }
}

export function buildVendasCompetenciaUrl(params: VendasQueryParams = {}): string {
  const search = new URLSearchParams();
  if (params.data_venda_de) search.set('data_venda_de', params.data_venda_de);
  if (params.data_venda_ate) search.set('data_venda_ate', params.data_venda_ate);
  if (params.empreendimento?.trim()) search.set('empreendimento', params.empreendimento.trim());
  if (params.imobiliaria?.trim()) search.set('imobiliaria', params.imobiliaria.trim());
  const qs = search.toString();
  return qs ? `/api/cvcrm/competencia?${qs}` : '/api/cvcrm/competencia';
}

export async function fetchVendasCompetencia(params: VendasQueryParams = {}) {
  return apiFetch<VendasCompetenciaResponse>(buildVendasCompetenciaUrl(params));
}
