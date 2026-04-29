/**
 * UI Shell: serviços corporativos mockados, sem chamadas externas.
 */

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

export async function getCorporateProfile(): Promise<CorporateProfileResult> {
  return {
    data: null,
    notFound: true,
    debug: { url: 'mock://corporate-profile', hint: 'UI shell — sem dados corporativos mockados.' },
  };
}

export interface NeonDepartment {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  color: string | null;
  /** Id de workspace (mock / legado de schema). */
  workspaceId?: string | null;
}

/** Departamentos (lista vazia no mock). */
export async function getDepartments(): Promise<NeonDepartment[]> {
  return [];
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
  return [];
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
export async function resolveGeTeamsWorkspaceId(_workspaceName: string): Promise<string | null> {
  return null;
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
  return {};
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
export async function getDepartmentTeamStats(_departmentIds: string[]): Promise<DepartmentTeamStatsMap> {
  return {};
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
  _departmentIds: string[],
): Promise<NeonTeamCollaborator[]> {
  return [];
}
