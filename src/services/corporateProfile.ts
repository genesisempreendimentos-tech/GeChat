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

/** URL absoluta para APIs Neon/GeTeams quando `VITE_GEAPPS_API_URL` está definida (ex.: produção). */
function neonApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return API_CONFIGURED ? `${API_BASE}${p}` : p;
}

/** GET em rota /api com Bearer; em 401 tenta refresh e repete uma vez. */
async function neonApiGet(path: string): Promise<Response> {
  let token = await getAccessTokenForNeonApi();
  if (!token) {
    return new Response(null, { status: 401 });
  }
  setGeappsAuthCookie(token);
  const url = neonApiUrl(path);
  const init: RequestInit = {
    method: 'GET',
    credentials: API_CONFIGURED ? 'omit' : 'same-origin',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  };
  let res = await fetch(url, init);
  if (res.status === 401) {
    const { data } = await supabase.auth.refreshSession();
    const t2 = data.session?.access_token;
    if (t2) {
      setGeappsAuthCookie(t2);
      res = await fetch(url, {
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
  /** Id do workspace no Neon (public.workspaces), quando existir em departments.workspace_id. */
  workspaceId?: string | null;
}

/**
 * Departamentos do Neon GêTeams com `departments.workspace_id` = id do workspace (nome em company_profile resolve esse id).
 */
export async function getDepartments(): Promise<NeonDepartment[]> {
  try {
    const res = await neonApiGet('/api/departments');
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((raw: Record<string, unknown>) => ({
      id: String(raw.id ?? ''),
      name: String(raw.name ?? ''),
      icon: raw.icon != null ? String(raw.icon) : null,
      description: raw.description != null ? String(raw.description) : null,
      color: raw.color != null ? String(raw.color) : null,
      workspaceId:
        raw.workspace_id != null && String(raw.workspace_id).trim()
          ? String(raw.workspace_id).trim()
          : null,
    }));
  } catch {
    return [];
  }
}

export type NeonWorkspaceOption = { id: string; name: string };

function parseWorkspacesActivePayload(data: unknown): NeonWorkspaceOption[] {
  if (!Array.isArray(data)) return [];
  const out: NeonWorkspaceOption[] = [];
  for (const item of data) {
    if (typeof item === 'string' && item.trim()) {
      out.push({ id: '', name: item.trim() });
      continue;
    }
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const o = item as Record<string, unknown>;
      const name = String(o.name ?? '').trim();
      if (!name) continue;
      const id = o.id != null ? String(o.id).trim() : '';
      out.push({ id, name });
    }
  }
  return out;
}

/**
 * Workspaces ativos no Neon (id + nome), para alinhar a `company_profile.geteams_workspace_id`.
 */
export async function getActiveWorkspacesWithIds(): Promise<NeonWorkspaceOption[]> {
  try {
    const res = await neonApiGet('/api/workspaces-active');
    if (!res.ok) return [];
    const data = await res.json();
    return parseWorkspacesActivePayload(data);
  } catch {
    return [];
  }
}

/**
 * Nomes dos workspaces ativos (atalho sobre {@link getActiveWorkspacesWithIds}).
 */
export async function getActiveWorkspaces(): Promise<string[]> {
  const list = await getActiveWorkspacesWithIds();
  return list.map((w) => w.name);
}

/**
 * Resolve o id do workspace no Neon pelo nome (trim/case-insensitive), com o mesmo critério de `ge_teams_workspace`.
 */
export async function resolveGeTeamsWorkspaceId(workspaceName: string): Promise<string | null> {
  const name = String(workspaceName ?? '').trim();
  if (!name) return null;
  try {
    const res = await neonApiGet(`/api/workspace-resolve?q=${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { id?: string | null };
    const id = body.id != null ? String(body.id).trim() : '';
    return id || null;
  } catch {
    return null;
  }
}

/** Dados agregados do Neon (GeTeams) por e-mail normalizado (lowercase). */
export interface CollaboratorNeonMeta {
  /** Texto de `collaborators.department_cadeira_principal` (status active); exibido como "Departamento" no admin. */
  departamento: string;
  setor: string;
}

function parseAllCollaboratorsPayload(data: unknown): Record<string, CollaboratorNeonMeta> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const out: Record<string, CollaboratorNeonMeta> = {};
  for (const [email, v] of Object.entries(data as Record<string, unknown>)) {
    const key = email.toLowerCase().trim();
    if (!key) continue;
    if (typeof v === 'string') {
      out[key] = { departamento: '', setor: v.trim() };
      continue;
    }
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      const dept = String(
        o.departamento ?? o.department_cadeira_principal ?? o.department ?? ''
      ).trim();
      const set = String(o.setor ?? o.setor_cadeira_principal ?? '').trim();
      out[key] = {
        departamento: dept,
        setor: set,
      };
    }
  }
  return out;
}

/**
 * Busca departamento e setor (Neon GeTeams) para colaboradores ativos.
 * GET /api/all-collaborators-sectors — resposta: `{ [email]: { departamento, setor } }`.
 */
export async function getAllCollaboratorsNeonMeta(): Promise<Record<string, CollaboratorNeonMeta>> {
  try {
    const res = await neonApiGet('/api/all-collaborators-sectors');
    if (!res.ok) return {};
    const data = await res.json();
    return parseAllCollaboratorsPayload(data);
  } catch (error) {
    console.error('Erro ao buscar metadados Neon dos colaboradores:', error);
    return {};
  }
}

/**
 * Mapa e-mail → nome do setor (compatível com telas que só precisam do setor).
 * Usa o mesmo endpoint que `getAllCollaboratorsNeonMeta`.
 */
export async function getAllCollaboratorsSectors(): Promise<Record<string, string>> {
  const meta = await getAllCollaboratorsNeonMeta();
  const map: Record<string, string> = {};
  for (const [k, m] of Object.entries(meta)) {
    if (m.setor) map[k] = m.setor;
  }
  return map;
}

export interface DepartmentTeamStatEntry {
  sectors: string[];
  collaboratorCount: number;
  /** Colaboradores ativos por nome de setor (mesmo critério que `sectors`). */
  sectorCounts: Record<string, number>;
  /** Ícone do setor cadastrado no Neon (sectors.icon). */
  sectorIcons: Record<string, string>;
  /** Cor do setor cadastrado no Neon (sectors.color). */
  sectorColors: Record<string, string>;
}

export type DepartmentTeamStatsMap = Record<string, DepartmentTeamStatEntry>;

/**
 * Setores distintos e total de colaboradores ativos por id de departamento no Neon
 * (cruzamento por nome do departamento em collaborators.department_cadeira_principal).
 */
export async function getDepartmentTeamStats(departmentIds: string[]): Promise<DepartmentTeamStatsMap> {
  const uniq = [...new Set(departmentIds.map((s) => String(s).trim()).filter(Boolean))];
  if (!uniq.length || !API_CONFIGURED) return {};
  const params = new URLSearchParams();
  params.set('ids', uniq.join(','));
  try {
    const res = await neonApiGet(`/api/department-team-stats?${params.toString()}`);
    if (!res.ok) return {};
    const data = (await res.json()) as unknown;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    const out: DepartmentTeamStatsMap = {};
    for (const [id, v] of Object.entries(data as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue;
      const o = v as {
        sectors?: unknown;
        collaboratorCount?: unknown;
        sectorCounts?: unknown;
        sectorIcons?: unknown;
        sectorColors?: unknown;
      };
      const sectors = Array.isArray(o.sectors)
        ? o.sectors.filter((x): x is string => typeof x === 'string')
        : [];
      const collaboratorCount =
        typeof o.collaboratorCount === 'number' && Number.isFinite(o.collaboratorCount)
          ? o.collaboratorCount
          : 0;
      const sectorCounts: Record<string, number> = {};
      if (o.sectorCounts && typeof o.sectorCounts === 'object' && !Array.isArray(o.sectorCounts)) {
        for (const [sk, sv] of Object.entries(o.sectorCounts as Record<string, unknown>)) {
          if (typeof sv === 'number' && Number.isFinite(sv)) sectorCounts[sk] = sv;
        }
      }
      const sectorIcons: Record<string, string> = {};
      if (o.sectorIcons && typeof o.sectorIcons === 'object' && !Array.isArray(o.sectorIcons)) {
        for (const [sk, sv] of Object.entries(o.sectorIcons as Record<string, unknown>)) {
          if (typeof sv === 'string' && sv) sectorIcons[sk] = sv;
        }
      }
      const sectorColors: Record<string, string> = {};
      if (o.sectorColors && typeof o.sectorColors === 'object' && !Array.isArray(o.sectorColors)) {
        for (const [sk, sv] of Object.entries(o.sectorColors as Record<string, unknown>)) {
          if (typeof sv === 'string' && sv) sectorColors[sk] = sv;
        }
      }
      out[id] = { sectors, collaboratorCount, sectorCounts, sectorIcons, sectorColors };
    }
    return out;
  } catch {
    return {};
  }
}

export interface NeonTeamCollaborator {
  id: string;
  name: string;
  email: string;
  departmentName: string;
  sectorName: string;
  birthDate?: string;
  hireDate?: string;
  neonDepartmentId: string;
}

/**
 * Colaboradores ativos no Neon alinhados aos departamentos das equipes (ids Neon).
 */
export async function getNeonCollaboratorsForTeamDepartments(
  departmentIds: string[],
): Promise<NeonTeamCollaborator[]> {
  const uniq = [...new Set(departmentIds.map((s) => String(s).trim()).filter(Boolean))];
  if (!uniq.length || !API_CONFIGURED) return [];
  const params = new URLSearchParams();
  params.set('ids', uniq.join(','));
  try {
    const res = await neonApiGet(`/api/teams-neon-collaborators?${params.toString()}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { collaborators?: unknown };
    const raw = data.collaborators;
    if (!Array.isArray(raw)) return [];
    const out: NeonTeamCollaborator[] = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const id = typeof o.id === 'string' ? o.id : '';
      const name = typeof o.name === 'string' ? o.name : '—';
      const email = typeof o.email === 'string' ? o.email : '';
      const departmentName = typeof o.departmentName === 'string' ? o.departmentName : '';
      const sectorName = typeof o.sectorName === 'string' ? o.sectorName : '';
      const neonDepartmentId = typeof o.neonDepartmentId === 'string' ? o.neonDepartmentId : '';
      if (!email || !neonDepartmentId) continue;
      out.push({
        id: id || email.toLowerCase(),
        name,
        email,
        departmentName,
        sectorName,
        birthDate: typeof o.birthDate === 'string' ? o.birthDate : '',
        hireDate: typeof o.hireDate === 'string' ? o.hireDate : '',
        neonDepartmentId,
      });
    }
    return out;
  } catch {
    return [];
  }
}
