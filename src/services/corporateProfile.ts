/**
 * Serviço para consumir dados do perfil corporativo (Neon GeTeams) via API proxy.
 * Apenas leitura; nenhum dado é enviado para o Neon.
 */
import { supabase } from './supabase';

const API_BASE = (import.meta.env.VITE_GEAPPS_API_URL ?? '').replace(/\/$/, '');

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

/**
 * Busca o perfil corporativo do usuário logado (por e-mail) no banco Neon (GeTeams).
 * Envia o token via cookie (geapps_auth_token) para contornar bloqueio do LiteSpeed
 * ao header Authorization.
 */
export async function getCorporateProfile(): Promise<CorporateProfileResult> {
  const requestUrl = API_BASE
    ? `${API_BASE}/api/corporate-profile`
    : (typeof window !== 'undefined'
        ? `${window.location.origin}/api/corporate-profile`
        : '/api/corporate-profile');

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
    document.cookie = `geapps_auth_token=${session.access_token}; path=/; SameSite=Strict; Secure`;

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
      cadeira_principal: String(raw.cadeira_principal ?? ''),
      cadeiras_secundarias: String(raw.cadeiras_secundarias ?? ''),
      primary_chair_id: String(raw.primary_chair_id ?? ''),
    };
    return { data, notFound: false, debug };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro de conexão.';
    console.error('[corporateProfile]', err);
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
