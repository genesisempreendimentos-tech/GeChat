/**
 * Serviço para consumir dados do perfil corporativo (Neon GeTeams) via API proxy.
 * Apenas leitura; nenhum dado é enviado para o Neon.
 */
import { supabase } from './supabase';

const API_BASE = (import.meta.env.VITE_GEAPPS_API_URL ?? '').replace(/\/$/, '');

/** Retorna true apenas quando a URL da API externa está explicitamente configurada. */
const API_CONFIGURED = API_BASE.length > 0;

export interface CorporativoFormData {
  name: string;
  personal_email: string;
  corporate_email: string;
  phone: string;
  cpf: string;
  birth_date: string;
  avatar_url: string;
  profession: string;
  gender: string;
  address: string;
  hire_date: string;
  dismissal_date: string;
  marital_status: string;
  curriculum_url: string;
  contract_url: string;
  departamento: string;
  setor: string;
  cadeira_principal: string;
  cadeiras_secundarias: string;
  primary_chair_id: string;
  sector_icon: string;
  email?: string;
}

export type CorporateProfileResult =
  | { data: CorporativoFormData; notFound: false; debug?: CorporateProfileDebug }
  | { data: null; notFound: true; error?: string; debug?: CorporateProfileDebug };

export interface CorporateProfileDebug {
  url: string;
  status?: number;
  statusText?: string;
  error?: string;
  hint?: string;
}

/** Cookie auxiliar para ambientes onde o header Authorization é bloqueado (ex.: LiteSpeed). */
function setGeappsAuthCookie(token: string) {
  if (typeof document === 'undefined') return;
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:';
  document.cookie = `geapps_auth_token=${encodeURIComponent(token)}; path=/; SameSite=Strict${
    secure ? '; Secure' : ''
  }`;
}

/** Token JWT para APIs /api/* (sessão atual ou refresh). */
async function getAccessTokenForNeonApi(): Promise<string | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (!error && session?.access_token) {
    return session.access_token;
  }
  const { data: refreshed } = await supabase.auth.refreshSession();
  return refreshed.session?.access_token ?? session?.access_token ?? null;
}

/** GET em rota /api relativa com Bearer; em 401 tenta refresh e repete uma vez. */
async function neonApiGet(path: string): Promise<Response> {
  let token = await getAccessTokenForNeonApi();
  if (!token) {
    return new Response(null, { status: 401 });
  }
  setGeappsAuthCookie(token);
  const init: RequestInit = {
    method: 'GET',
    credentials: 'same-origin',
    headers: { Authorization: `Bearer ${token}` },
  };
  let res = await fetch(path, init);
  if (res.status === 401) {
    const { data } = await supabase.auth.refreshSession();
    const t2 = data.session?.access_token;
    if (t2) {
      setGeappsAuthCookie(t2);
      res = await fetch(path, {
        ...init,
        headers: { Authorization: `Bearer ${t2}` },
      });
    }
  }
  return res;
}

/**
 * Busca o perfil corporativo do usuário logado (por e-mail) no banco Neon (GeTeams).
 * Envia o token via cookie (geapps_auth_token) para contornar bloqueio do LiteSpeed
 * ao header Authorization.
 */
export async function getCorporateProfile(): Promise<CorporateProfileResult> {
  // Sem URL configurada, não faz nenhuma requisição (evita 404 no console em dev)
  if (!API_CONFIGURED) {
    return { data: null, notFound: true };
  }

  const requestUrl = `${API_BASE}/api/corporate-profile`;

  const emptyDebug = (error?: string, hint?: string): CorporateProfileDebug => ({
    url: requestUrl,
    error,
    hint,
  });

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      return {
        data: null,
        notFound: true,
        error: 'Sessão não disponível.',
        debug: emptyDebug('Sessão não disponível.', 'Faça login novamente.'),
      };
    }

    // Envia o token via cookie para contornar bloqueio do LiteSpeed ao header Authorization
    setGeappsAuthCookie(session.access_token);

    const res = await fetch(requestUrl, {
      method: 'GET',
      credentials: 'same-origin', // envia cookies automaticamente
      headers: {
        Authorization: `Bearer ${session.access_token}`, // mantém o header como fallback
      },
    });

    const debug: CorporateProfileDebug = {
      url: requestUrl,
      status: res.status,
      statusText: res.statusText,
    };

    if (res.status === 401) {
      return {
        data: null,
        notFound: true,
        error: 'Não autorizado.',
        debug: {
          ...debug,
          error: 'Não autorizado.',
          hint: 'Token inválido ou header Authorization não enviado (verifique .htaccess no servidor).',
        },
      };
    }

    const body = await res.json().catch(() => ({}));

    if (res.status === 404 || body.notFound === true) {
      return {
        data: null,
        notFound: true,
        debug: { ...debug, hint: 'Nenhum colaborador no GêTeams com este e-mail.' },
      };
    }

    if (!res.ok) {
      const errMsg = (body && (body.error || body.message)) || res.statusText || 'Erro ao carregar perfil corporativo.';
      if (res.status !== 404) {
        console.warn('[corporateProfile] API indisponível:', res.status, errMsg);
      }
      return {
        data: null,
        notFound: true,
        error: errMsg,
        debug: {
          ...debug,
          error: errMsg,
          hint: res.status === 503
            ? 'Backend PHP/Neon não configurado ou indisponível. Verifique config.corporate.php e extensão pdo_pgsql.'
            : undefined,
        },
      };
    }

    const raw = body as Record<string, unknown>;
    const data: CorporativoFormData = {
      name: String(raw.name ?? ''),
      personal_email: String(raw.personal_email ?? raw.email ?? ''),
      corporate_email: String(raw.corporate_email ?? ''),
      phone: String(raw.phone ?? ''),
      cpf: String(raw.cpf ?? ''),
      birth_date: String(raw.birth_date ?? ''),
      avatar_url: String(raw.avatar_url ?? ''),
      profession: String(raw.profession ?? ''),
      gender: String(raw.gender ?? ''),
      address: String(raw.address ?? ''),
      hire_date: String(raw.hire_date ?? ''),
      dismissal_date: String(raw.dismissal_date ?? ''),
      marital_status: String(raw.marital_status ?? ''),
      curriculum_url: String(raw.curriculum_url ?? ''),
      contract_url: String(raw.contract_url ?? ''),
      departamento: String(raw.departamento ?? ''),
      setor: String(raw.setor ?? ''),
      cadeira_principal: String(raw.cadeira_principal ?? raw.primary_chair_id ?? ''),
      cadeiras_secundarias: String(raw.cadeiras_secundarias ?? ''),
      primary_chair_id: String(raw.primary_chair_id ?? ''),
      sector_icon: String(raw.sector_icon ?? raw.setor_icon ?? ''),
    };
    return { data, notFound: false, debug };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro de conexão.';
    console.warn('[corporateProfile] Perfil corporativo indisponível:', message);
    return {
      data: null,
      notFound: true,
      error: message,
      debug: emptyDebug(
        message,
        'Rede falhou ou URL incorreta. Em produção, confira se a API PHP está em /api/corporate-profile e se o .htaccess está ativo.',
      ),
    };
  }
}

export interface NeonDepartment {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  color: string | null;
}

/**
 * Busca todos os departamentos ativos da tabela departaments do Neon GeTeams.
 */
export async function getDepartments(): Promise<NeonDepartment[]> {
  try {
    const res = await neonApiGet('/api/departments');
    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Busca os setores de todos os colaboradores a partir do banco Neon.
 * Utilizado na listagem de membros do painel admin.
 * Usa sempre URL relativa /api/... para funcionar tanto via proxy Vite (dev)
 * quanto via PHP em produção.
 */
export async function getAllCollaboratorsSectors(): Promise<Record<string, string>> {
  try {
    const res = await neonApiGet('/api/all-collaborators-sectors');
    if (!res.ok) return {};

    const data = await res.json();
    return data || {};
  } catch (error) {
    console.error('Erro ao buscar setores dos colaboradores:', error);
    return {};
  }
}
