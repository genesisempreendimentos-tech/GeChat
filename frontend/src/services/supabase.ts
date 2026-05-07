import type { ProfileThema } from '@/lib/themeMapping';
import type { SidebarMode } from '@/lib/sidebarMode';
import type { Category, User } from '@/types';
import { validateStatementCaption, validateStatementTitle } from '@/constants/statementLimits';
import {
  uiShellAdminUser,
  uiShellCategories,
  uiShellCompanyProfile,
  uiShellRequestChannels,
  uiShellStatements,
  uiShellSystems,
  uiShellTeams,
  uiShellUser,
} from '@/mocks/uiShellData';
import { delayMock, randomId } from '@/mocks/uiShellUtils';

/** ID fixo do app “hub” apenas para o mock de UI (não é recurso real). */
export const GENOVO_APP_ID = '00000000-0000-4000-8000-000000000001' as const;

/** Nomes de tabelas usados só como contrato de tipos no mock. */
export const REQUEST_CHANNELS_TABLE = 'request_channels';
export const TEAMS_TABLE = 'teams';
export const STATEMENT_TABLE = 'statement';
export const STATEMENT_REACTION_TABLE = 'statement_reaction';
export const COMPANY_PROFILE_TABLE = 'company_profile';

export type CompanyProfileApp = {
  name: string;
  logo: string;
  description: string;
  segment: string;
  createdAt: string;
  location: string;
  site: string;
  phone: string;
  email: string;
  cnpj: string;
  geTeamsWorkspace: string;
  /** Id de workspace (mock / legado de schema). */
  geTeamsWorkspaceId: string;
};

export type RequestChannelType = 'departamento' | 'setor';

export interface RequestChannel {
  id: string;
  name: string;
  icon: string;
  url: string;
  channel_type: RequestChannelType;
  description?: string;
  color?: string;
  createdAt?: Date;
  /** Igual a company_profile.ge_teams_workspace no momento da criação. */
  workspace?: string;
  /** Id de workspace (mock). */
  workspaceId?: string;
}

/** Ciclo de vida da equipe (mock). */
export type TeamLifecycleStatus = 'active' | 'archived' | 'deleted';

export interface Team {
  id: string;
  name: string;
  status: TeamLifecycleStatus;
  neonDepartmentId: string;
  createdAt?: Date;
  updatedAt?: Date;
  /** Nome do workspace (mock). */
  workspaceName?: string;
  /** Id do workspace (mock). */
  workspaceId?: string;
}

export interface Statement {
  id: string;
  title: string;
  imageUrl: string;
  caption?: string;
  tags: string[];
  isOfficial?: boolean;
  /** Data de criação do registo (`statement.created_at`). */
  publishedAt: Date;
  userId: string;
  /** Nome do autor (`statement.creator_name`, espelho de `profiles.name`). */
  creatorName?: string;
  /** Avatar do autor (via `profiles` em `listStatements`). */
  creatorAvatarUrl?: string;
  /** Soft-archive (`statement.is_archived`). */
  isArchived?: boolean;
  /** Vem da relação por utilizador na tabela `statement_reaction`. */
  viewed: boolean;
}

export interface StatementReaction {
  id: string;
  statementId: string;
  userId: string;
  userName: string;
  viewed: boolean;
  reaction?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  isActive: boolean;
}

export interface StatementReactionWithUser extends StatementReaction {
  userEmail?: string;
  userAvatar?: string;
}

export interface StatementComment {
  id: string;
  statementId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  isActive: boolean;
}

export interface StatementCommentWithUser extends StatementComment {
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  department?: string;
}

/** Máximo de aplicativos favoritos por usuário (regra de negócio + validação em toggleFavorite). */
export const MAX_FAVORITE_APPS_PER_USER = 5;

/** Código retornado em `error` quando o usuário tenta exceder MAX_FAVORITE_APPS_PER_USER. */
export const FAVORITE_LIMIT_ERROR_CODE = 'FAVORITE_LIMIT' as const;

type UserProfile = User & {
  full_name?: string;
  banner_url?: string | null;
  profession?: string | null;
  birth_date?: string | null;
  hire_date?: string | null;
};
type AccessRow = { user_id: string; app_id: string; access: boolean; is_favorite: boolean; access_type: string };

const mockDb = {
  currentUser: null as UserProfile | null,
  profiles: [uiShellUser, uiShellAdminUser].map((u) => ({ ...u, full_name: u.name })) as UserProfile[],
  systems: [...uiShellSystems],
  categories: [...uiShellCategories],
  access: [
    { user_id: uiShellUser.id, app_id: GENOVO_APP_ID, access: true, is_favorite: false, access_type: 'member' },
    { user_id: uiShellAdminUser.id, app_id: GENOVO_APP_ID, access: true, is_favorite: false, access_type: 'admin' },
  ] as AccessRow[],
  /** Dashboard / histórico de acesso: vazio para UI shell só visual. */
  accessLogs: [] as Array<Record<string, unknown>>,
  statements: [...uiShellStatements],
  reactions: [] as StatementReaction[],
  comments: [] as StatementCommentWithUser[],
  requestChannels: [...uiShellRequestChannels],
  teams: [...uiShellTeams],
  companyProfile: { ...uiShellCompanyProfile },
  quotes: [] as Array<{ id: string; frases?: string | null; frase?: string | null; autor?: string | null }>,
  conversations: [] as Array<{ id: string; created_at: string; updated_at: string; participantIds: string[] }>,
  messages: [] as Array<{ id: string; conversation_id: string; sender_id: string; content: string; created_at: string }>,
};

type MockSession = { access_token: string; user: { id: string; email: string } };
const listeners = new Set<(event: string) => void>();
let session: MockSession | null = null;

function notifyAuth(event: string) {
  listeners.forEach((cb) => cb(event));
}

function mapUser(row: UserProfile): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: (row.accessType as User['role']) || 'user',
    avatar: row.avatar,
    createdAt: row.createdAt,
    accessType: row.accessType,
    profileStatus: row.profileStatus,
    sidebar: row.sidebar,
  };
}

function currentSession(): MockSession | null {
  if (!mockDb.currentUser) return null;
  if (!session) {
    session = {
      access_token: 'ui-shell-token',
      user: { id: mockDb.currentUser.id, email: mockDb.currentUser.email },
    };
  }
  return session;
}

function normalizeRole(value: unknown): User['role'] {
  return value === 'admin' || value === 'creator' || value === 'user' ? value : 'user';
}

function profileRecordToUser(row: Record<string, any>, fallback: { id: string; email?: string | null }): UserProfile {
  const name =
    row.full_name ??
    row.name ??
    row.nome ??
    row.display_name ??
    fallback.email?.split('@')[0] ??
    'Usuário';
  const accessType = String(row.access_type ?? row.accessType ?? row.role ?? 'user');
  return {
    id: String(row.user_id ?? row.id ?? fallback.id),
    name: String(name),
    full_name: String(name),
    email: String(row.email ?? fallback.email ?? ''),
    role: normalizeRole(accessType),
    accessType,
    profileStatus: row.profile_status ?? row.profileStatus ?? 'active',
    avatar: row.avatar_url ?? row.avatar ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    sidebar: row.sidebar,
    banner_url: row.banner_url ?? null,
    profession: row.profession ?? null,
    birth_date: row.birth_date ?? null,
    hire_date: row.hire_date ?? null,
  };
}

function authUserToProfile(authUser: { id: string; email?: string | null; user_metadata?: Record<string, any> }): UserProfile {
  const meta = authUser.user_metadata ?? {};
  const name = meta.full_name ?? meta.name ?? authUser.email?.split('@')[0] ?? 'Usuário';
  const accessType = String(meta.access_type ?? meta.role ?? 'user');
  return {
    id: authUser.id,
    name: String(name),
    full_name: String(name),
    email: String(authUser.email ?? ''),
    role: normalizeRole(accessType),
    accessType,
    profileStatus: 'active',
    avatar: meta.avatar_url ?? meta.avatar ?? undefined,
    createdAt: new Date(),
  };
}

async function loadRealProfileForAuthUser(authUser: { id: string; email?: string | null; user_metadata?: Record<string, any> }) {
  return authUserToProfile(authUser);
}

type ApiAuthUser = UserProfile;

function apiError(message: string) {
  return { message };
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<{ data: T | null; error: any }> {
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
      return { data: null, error: apiError(payload?.error ?? 'Erro na API.') };
    }
    return { data: payload as T, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

function setCurrentUserFromApi(user: ApiAuthUser | null | undefined) {
  mockDb.currentUser = user ? { ...user, createdAt: user.createdAt ? new Date(user.createdAt) : new Date() } : null;
  if (mockDb.currentUser && !mockDb.profiles.some((u) => u.id === mockDb.currentUser?.id)) {
    mockDb.profiles.push(mockDb.currentUser);
  }
  session = mockDb.currentUser
    ? { access_token: 'server-cookie-session', user: { id: mockDb.currentUser.id, email: mockDb.currentUser.email } }
    : null;
}

const serverAuth = {
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const { data, error } = await apiFetch<{ user: ApiAuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setCurrentUserFromApi(data?.user);
    notifyAuth(error ? 'SIGNED_OUT' : 'SIGNED_IN');
    return { data: { user: data?.user ?? null, session: currentSession() }, error };
  },

  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, any> } }) {
    const fullName = String(options?.data?.full_name ?? options?.data?.name ?? '');
    const role = String(options?.data?.role ?? 'user');
    const { data, error } = await apiFetch<{ user: ApiAuthUser }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName, role }),
    });
    setCurrentUserFromApi(data?.user);
    notifyAuth(error ? 'SIGNED_OUT' : 'SIGNED_IN');
    return { data: { user: data?.user ?? null, session: currentSession() }, error };
  },

  async signOut() {
    const { error } = await apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
    setCurrentUserFromApi(null);
    notifyAuth('SIGNED_OUT');
    return { error };
  },

  async getUser() {
    const { data, error } = await apiFetch<{ user: ApiAuthUser | null }>('/api/auth/me');
    setCurrentUserFromApi(data?.user);
    return { data: { user: data?.user ?? null }, error };
  },

  async getSession() {
    const { data, error } = await apiFetch<{ user: ApiAuthUser | null }>('/api/auth/me');
    setCurrentUserFromApi(data?.user);
    return { data: { session: data?.user ? currentSession() : null }, error };
  },

  async resetPasswordForEmail(email: string, options?: { redirectTo?: string }) {
    const { data, error } = await apiFetch<{ data: unknown }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, redirectTo: options?.redirectTo }),
    });
    return { data, error };
  },

  async updateUser(payload: { password?: string }) {
    const { data, error } = await apiFetch<{ user: ApiAuthUser | null }>('/api/auth/password', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (data?.user) setCurrentUserFromApi(data.user);
    return { data: { user: data?.user ?? null }, error };
  },

  onAuthStateChange(callback: (event: string) => void) {
    listeners.add(callback);
    return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
  },
};

class MockQuery {
  private filters: Array<(row: Record<string, unknown>) => boolean> = [];
  private take: number | null = null;
  private insertPayload: unknown = null;
  private updatePayload: Record<string, unknown> | null = null;
  private deleteMode = false;
  private onlyCount = false;
  private maybeOne = false;
  private one = false;

  constructor(private readonly table: string) {}
  select(_fields?: string, options?: { head?: boolean; count?: 'exact' }) {
    this.onlyCount = options?.head === true && options.count === 'exact';
    return this;
  }
  order(_field: string, _opts?: { ascending?: boolean }) { return this; }
  limit(n: number) { this.take = n; return this; }
  range(_from: number, _to: number) { return this; }
  eq(field: string, value: unknown) { this.filters.push((r) => r[field] === value); return this; }
  ilike(field: string, value: string) {
    const probe = value.replace(/%/g, '').toLowerCase();
    this.filters.push((r) => String(r[field] ?? '').toLowerCase().includes(probe));
    return this;
  }
  in(field: string, values: unknown[]) { this.filters.push((r) => values.includes(r[field])); return this; }
  gte(field: string, value: string) { this.filters.push((r) => String(r[field] ?? '') >= value); return this; }
  lt(field: string, value: string) { this.filters.push((r) => String(r[field] ?? '') < value); return this; }
  is(field: string, value: unknown) { this.filters.push((r) => (r[field] ?? null) === value); return this; }
  insert(payload: unknown) { this.insertPayload = payload; return this; }
  update(payload: Record<string, unknown>) { this.updatePayload = payload; return this; }
  delete() { this.deleteMode = true; return this; }
  upsert(payload: unknown) { this.insertPayload = payload; return this; }
  maybeSingle() { this.maybeOne = true; return this; }
  single() { this.one = true; return this; }

  private rows(): Record<string, unknown>[] {
    if (this.table === 'quotes') return mockDb.quotes as Record<string, unknown>[];
    if (this.table === 'audit_logs') return mockDb.accessLogs as Record<string, unknown>[];
    return [];
  }

  private applyFilters(list: Record<string, unknown>[]) {
    const filtered = list.filter((row) => this.filters.every((f) => f(row)));
    return this.take ? filtered.slice(0, this.take) : filtered;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve().then(() => {
      if (this.table === 'audit_logs' && this.insertPayload) {
        const payload = Array.isArray(this.insertPayload) ? this.insertPayload[0] : this.insertPayload;
        mockDb.accessLogs.unshift({ ...(payload as object), id: randomId('log'), created_at: new Date().toISOString() });
        return { data: payload, error: null };
      }
      if (this.onlyCount) return { data: null, error: null, count: this.applyFilters(this.rows()).length };
      const list = this.applyFilters(this.rows());
      if (this.one || this.maybeOne) return { data: list[0] ?? null, error: null };
      return { data: list, error: null };
    }).then(onfulfilled as any, onrejected as any);
  }
}

export const supabase = {
  auth: serverAuth,
  storage: {
    from(_bucket: string) {
      return {
        async upload(path: string, _file: File) {
          return { data: { path }, error: null };
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: `https://mock.local/${path}` } };
        },
        async remove(_paths: string[]) {
          return { error: null };
        },
      };
    },
  },
  from(table: string) {
    return new MockQuery(table);
  },
  rpc(_fn: string, _args?: Record<string, unknown>) {
    return Promise.resolve({ data: null, error: null });
  },
  channel(_name: string) {
    return {
      on() { return this; },
      subscribe() { return { unsubscribe() {} }; },
    };
  },
};

// Storage Service
export const storageService = {
  async uploadAvatar(userId: string, _file: File) {
    return { url: `https://mock.local/avatar/${userId}`, error: null };
  },
  async deleteAvatar(_url: string) {
    return { error: null };
  },

  /** Upload de imagem do sistema/app para o bucket GeImage, pasta GeNovo. Retorna a URL pública. */
  async uploadSystemImage(file: File) { return { url: `https://mock.local/system/${file.name}`, error: null }; },

  /** Ícone de canal de solicitação — pasta dedicada no bucket GeImage. */
  async uploadRequestChannelIcon(file: File) { return { url: `https://mock.local/channel/${file.name}`, error: null }; },

  /** PDF da descrição âncora dos apps — bucket Files/pasta GeNovo - Public/Ancora. */
  async uploadSystemAnchorPdf(file: File) { return { url: `https://mock.local/pdf/${file.name}`, error: null }; },

  /** Upload de imagem (mock — sem storage real). */
  async uploadComunicadoImage(file: File, _userId?: string): Promise<{ url: string | null; error: unknown | null }> {
    return { url: `https://mock.local/comunicado/${file.name}`, error: null };
  },
};

// Auth Service
export const authService = {
  async signIn(email: string, password: string) {
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.data?.user) {
      setCurrentUserFromApi(result.data.user as UserProfile);
    }
    return result;
  },
  async signUp(email: string, password: string, fullName: string, role: 'admin' | 'creator' | 'user' = 'user') {
    const result = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, name: fullName, role } } } as any);
    if (result.data?.user) {
      setCurrentUserFromApi(result.data.user as UserProfile);
    }
    return result;
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      mockDb.currentUser = null;
      session = null;
      return { error };
    } catch (error) {
      return { error };
    }
  },

  async resetPasswordForEmail(email: string, redirectTo?: string) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`,
      });
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getCurrentUser() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        mockDb.currentUser = null;
        return { data: null, error };
      }
      setCurrentUserFromApi(data.user as UserProfile);
      const exists = mockDb.profiles.some((u) => u.id === mockDb.currentUser?.id);
      if (mockDb.currentUser && !exists) mockDb.profiles.push(mockDb.currentUser);
      return { data: mockDb.currentUser ? mapUser(mockDb.currentUser) : null, error: null };
    } catch (error) {
      mockDb.currentUser = null;
      return { data: null, error };
    }
  },
};

export const databaseService = {
  async updateProfileThema(userId: string, thema: ProfileThema) { void userId; void thema; return { error: null }; },

  async updateProfileSidebar(userId: string, sidebar: SidebarMode) { void userId; void sidebar; return { error: null }; },

  /** Carrega o perfil da empresa (singleton via SELECT LIMIT 1). */
  async getCompanyProfile() { return { data: mockDb.companyProfile, error: null }; },

  /**
   * Salva o perfil da empresa.
   * Estratégia: tenta achar um registo existente (LIMIT 1) e faz UPDATE; se não houver, faz INSERT.
   */
  async saveCompanyProfile(profile: CompanyProfileApp) { mockDb.companyProfile = { ...profile }; return { error: null }; },

  // Profiles (mock)
  async getUsers() { return { data: mockDb.profiles.map(mapUser), error: null }; },

  async getAdministrators() { return { data: mockDb.profiles.filter((u) => u.accessType === 'admin').map(mapUser), error: null }; },

  /** Usuários com access_type === 'admin' na tabela profiles (acesso ao painel admin). */
  async getAppsAdmins() { return this.getAdministrators(); },

  /** Busca colaboradores (profiles) por nome ou e-mail para o modal Liberar acesso. */
  async searchProfiles(query: string) {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return { data: [], error: null };
    return {
      data: mockDb.profiles.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)).map((u) => ({ id: u.id, name: u.name, email: u.email, avatar: u.avatar })),
      error: null,
    };
  },

  async getAdminCounts() { return { users: mockDb.profiles.length, softadmins: mockDb.profiles.filter((u) => u.accessType === 'admin').length, apps: mockDb.systems.length, activeApps: mockDb.systems.filter((s) => s.active).length }; },

  /**
   * Conta todos os `app_access_daily` em audit_logs (qualquer utilizador).
   * Uso: painel **admin** — total global; não filtra por `actor_user_id`.
   */
  async getTotalAccessCount() { return mockDb.accessLogs.length; },

  /**
   * Conta `app_access_daily` apenas do utilizador (`actor_user_id` = sessão).
   * Uso: painel **utilizador** — cada um vê só a própria contagem (timestamps em `created_at`).
   */
  async getUserAccessCount(userId: string) { return mockDb.accessLogs.filter((l) => l.actor_user_id === userId).length; },

  /**
   * Soma o tempo em primeiro plano (eventos `screen_time_active`) para o utilizador no app GeNovo (slug em VITE_GENOVO_AUDIT_SLUG).
   * Pagina resultados para não truncar em 1000 linhas.
   */
  async getUserForegroundScreenTimeMsForGeNovo(_userId: string) { return 3_600_000; },

  async getAccessLogsAll(limit = 500) {
    return this.getAccessLogs(undefined, limit);
  },

  async getUserById(userId: string) {
    const u = mockDb.profiles.find((p) => p.id === userId);
    if (!u) return { data: null, error: { message: 'Profile not found' } };
    return { data: { ...u, full_name: u.name, avatar_url: u.avatar }, error: null };
  },

  /** Perfil completo e normalizado para o ProfileCardInfoPopup por user_id. */
  async getProfileForPopupByUserId(userId: string) { return this.getUserById(userId); },

  /** Perfil completo e normalizado para o ProfileCardInfoPopup por e-mail (case-insensitive). */
  async getProfileForPopupByEmail(email: string) {
    const u = mockDb.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (!u) return { data: null, error: { message: 'Profile not found' } };
    return { data: { ...u, full_name: u.name, avatar_url: u.avatar }, error: null };
  },

  async getRawProfileByEmail(email: string) { return this.getProfileForPopupByEmail(email); },

  async getUserByEmail(email: string) {
    const user = mockDb.profiles.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return { data: user ? mapUser(user) : null, error: null };
  },

  /** Verifica se o email existe em profiles (usa RPC profiles_email_exists se existir, senão getUserByEmail). */
  async profilesEmailExists(email: string) { return mockDb.profiles.some((u) => u.email.toLowerCase() === email.toLowerCase()); },

  async createUser(userData: any) {
    const user: UserProfile = { ...uiShellUser, id: userData.id ?? randomId('user'), name: userData.name, email: userData.email, accessType: userData.role ?? 'user', role: userData.role ?? 'user', avatar: userData.avatar };
    mockDb.profiles.push(user);
    return { data: mapUser(user), error: null };
  },

  async updateUser(userId: string, userData: any) {
    const user = mockDb.profiles.find((u) => u.id === userId);
    if (!user) return { data: null, error: { message: 'Profile not found' } };
    Object.assign(user, userData);
    if (userData.access_type) user.accessType = userData.access_type;
    if (userData.accessType) user.accessType = userData.accessType;
    if (userData.banner_url !== undefined) user.banner_url = userData.banner_url;
    return { data: mapUser(user), error: null };
  },

  async deleteUser(userId: string) { mockDb.profiles = mockDb.profiles.filter((u) => u.id !== userId); return { error: null }; },

  // Status válidos para apps (alinhar a AdminSystemsPage / UI): inclui lançamento e variantes de excluído
  appRowToSystem(row: any): any { return row; },

  async getSystems() { return { data: [...mockDb.systems], error: null }; },

  async getSystemById(systemId: string) { return { data: mockDb.systems.find((s) => s.id === systemId) ?? null, error: null }; },

  /** Busca app por slug (ex.: geteams, geforms). Usado por apps irmãos para validar acesso. */
  async getAppBySlug(slug: string) {
    const needle = slug.toLowerCase().replace(/\s+/g, '');
    const app = mockDb.systems.find((s) => s.name.toLowerCase().replace(/[êé]/g, 'e').replace(/\s+/g, '') === needle);
    return { data: app ?? null, error: null };
  },

  /** Verifica se o usuário tem acesso ao app (user_app_access.access = true e app ativo/beta). */
  async userHasAccessToApp(userId: string, appId: string) { return { data: mockDb.access.some((r) => r.user_id === userId && r.app_id === appId && r.access), error: null }; },

  /** Verifica se o usuário tem acesso ao app identificado pelo slug (ex.: geteams). */
  async userHasAccessToAppBySlug(userId: string, slug: string) {
    const { data: app, error: appErr } = await this.getAppBySlug(slug);
    if (appErr || !app) return { data: false, error: appErr };
    return this.userHasAccessToApp(userId, app.id);
  },

  /**
   * Retorna o valor explícito de access para o app hub (mock).
   * Regras:
   * - `true`: possui linha com access = true
   * - `false`: possui linha com access = false (deve bloquear)
   * - `null`: sem linha / valor não determinável
   */
  async getGeNovoExplicitAccess(userId: string) {
    const row = mockDb.access.find((r) => r.user_id === userId && r.app_id === GENOVO_APP_ID);
    return { data: row ? row.access : null, error: null };
  },

  /**
   * Apps visíveis para um membro: user_app_access.access = true para o user_id,
   * e app com status ativo/beta. Só esses aparecem em "aplicativos disponíveis".
   */
  async getSystemsForMember(userId: string) {
    const ids = mockDb.access.filter((r) => r.user_id === userId && r.access).map((r) => r.app_id);
    return { data: mockDb.systems.filter((s) => ids.includes(s.id)), error: null };
  },

  async createSystem(systemData: any) {
    const system = { id: randomId('sys'), active: true, createdAt: new Date(), ...systemData };
    mockDb.systems.push(system);
    return { data: system, error: null };
  },

  async updateSystem(systemId: string, systemData: any) {
    const system = mockDb.systems.find((s) => s.id === systemId);
    if (!system) return { data: null, error: { message: 'System not found' } };
    Object.assign(system, systemData);
    if (systemData.status) system.active = ['ativo', 'beta', 'lancamento'].includes(String(systemData.status));
    return { data: system, error: null };
  },

  async deleteSystem(systemId: string) { mockDb.systems = mockDb.systems.filter((s) => s.id !== systemId); return { error: null }; },

  // User App Access (tabela user_app_access: access, is_favorite, access_type 'member'|'viewer')
  async getUserSystemAccess(userId: string) {
    return { data: mockDb.access.filter((r) => r.user_id === userId).map((r) => ({ ...r, system_id: r.app_id, can_access: r.access, is_favorite: r.is_favorite })), error: null };
  },

  /** Usuários com acesso a um app (rodapé dos cards / AvatarGroup). */
  async getUsersWithAccessToApp(appId: string) {
    const ids = mockDb.access.filter((r) => r.app_id === appId && r.access).map((r) => r.user_id);
    return { data: mockDb.profiles.filter((u) => ids.includes(u.id)).map((u) => ({ id: u.id, name: u.name, avatar: u.avatar })), error: null };
  },

  async setUserSystemAccess(userId: string, systemId: string, canAccess: boolean) {
    let row = mockDb.access.find((r) => r.user_id === userId && r.app_id === systemId);
    if (!row) {
      row = { user_id: userId, app_id: systemId, access: canAccess, is_favorite: false, access_type: 'member' };
      mockDb.access.push(row);
    } else {
      row.access = canAccess;
      if (!canAccess) row.is_favorite = false;
    }
    return { data: row, error: null };
  },

  /** Conta favoritos ativos: access true e is_favorite true (alinha à UI de favoritos). */
  async countActiveFavoriteApps(userId: string) { return { count: mockDb.access.filter((r) => r.user_id === userId && r.access && r.is_favorite).length, error: null }; },

  async toggleFavorite(userId: string, systemId: string) {
    let row = mockDb.access.find((r) => r.user_id === userId && r.app_id === systemId);
    if (!row) {
      row = { user_id: userId, app_id: systemId, access: true, is_favorite: false, access_type: 'member' };
      mockDb.access.push(row);
    }
    if (!row.is_favorite) {
      const count = mockDb.access.filter((r) => r.user_id === userId && r.is_favorite && r.access).length;
      if (count >= MAX_FAVORITE_APPS_PER_USER) return { data: null, error: { code: FAVORITE_LIMIT_ERROR_CODE, message: `É permitido no máximo ${MAX_FAVORITE_APPS_PER_USER} aplicativos favoritos.` } };
    }
    row.is_favorite = !row.is_favorite;
    return { data: row, error: null };
  },

  async getAccessLogs(userId?: string, limit = 50) {
    const logs = mockDb.accessLogs.filter((l) => !userId || l.actor_user_id === userId).slice(0, limit);
    return { data: logs, error: null };
  },

  // Categories (tabela categories)
  async getCategories() { return { data: [...mockDb.categories], error: null }; },

  async createCategory(categoryData: Partial<Category>) {
    const row: Category = { id: randomId('cat'), name: categoryData.name || 'Categoria', ...categoryData };
    mockDb.categories.push(row);
    return { data: row, error: null };
  },

  async updateCategory(id: string, categoryData: Partial<Category>) {
    const row = mockDb.categories.find((c) => c.id === id);
    if (!row) return { data: null, error: { message: 'Category not found' } };
    Object.assign(row, categoryData);
    return { data: row, error: null };
  },

  async deleteCategory(id: string) { mockDb.categories = mockDb.categories.filter((c) => c.id !== id); return { error: null }; },

  /** Comunicados (`statement`). Lista vazia se a tabela não existir ou houver erro. */
  async listStatements(includeArchived = false) {
    return { data: includeArchived ? [...mockDb.statements] : mockDb.statements.filter((s) => !s.isArchived), error: null as null };
  },

  /** Regista que o utilizador atual abriu o comunicado (idempotente). */
  async markStatementViewed(statementId: string) { return this.upsertStatementReaction(statementId, { viewed: true }); },

  /** Há algum comunicado que o utilizador atual ainda não abriu? */
  async hasUnviewedStatementsForCurrentUser() { return mockDb.statements.some((s) => !s.viewed); },

  /** Lista interações de comunicado, opcionalmente filtrando por ids de statement. */
  async listStatementReactions(statementIds?: string[]) {
    const ids = statementIds ?? [];
    return { data: mockDb.reactions.filter((r) => ids.length === 0 || ids.includes(r.statementId)), error: null };
  },

  /** Lista reações de um statement com dados básicos do profile para renderização em modal. */
  async listStatementReactionsWithUsers(statementId: string) {
    const reactions = mockDb.reactions.filter((r) => r.statementId === statementId);
    return { data: reactions.map((r) => ({ ...r, userEmail: mockDb.profiles.find((u) => u.id === r.userId)?.email, userAvatar: mockDb.profiles.find((u) => u.id === r.userId)?.avatar })), error: null };
  },

  /** Contagem de comentários ativos por comunicado (mesmos filtros que `listStatementComments`). */
  async countActiveStatementComments(statementId: string) { return { count: mockDb.comments.filter((c) => c.statementId === statementId).length, error: null }; },

  /** Lista comentários de um comunicado com dados do usuário. */
  async listStatementComments(statementId: string) { return { data: mockDb.comments.filter((c) => c.statementId === statementId), error: null }; },

  /** Adiciona um comentário a um comunicado. */
  async addStatementComment(statementId: string, content: string): Promise<{ data: StatementCommentWithUser | null; error: unknown | null }> {
    const u = mockDb.currentUser ?? uiShellUser;
    const item: StatementCommentWithUser = { id: randomId('cmt'), statementId, userId: u.id, content: content.trim(), createdAt: new Date(), updatedAt: new Date(), deletedAt: null, isActive: true, userName: u.name, userEmail: u.email, userAvatar: u.avatar };
    mockDb.comments.push(item);
    return { data: item, error: null };
  },

  /** Deleta (soft delete) um comentário. */
  async deleteStatementComment(commentId: string) { mockDb.comments = mockDb.comments.filter((c) => c.id !== commentId); return { error: null }; },

  /**
   * Cria/atualiza interação do utilizador autenticado com o comunicado.
   * Usa upsert com constraint única (statement_id, user_id).
   */
  async upsertStatementReaction(statementId: string, payload: { viewed?: boolean; reaction?: string | null }) {
    const u = mockDb.currentUser ?? uiShellUser;
    const row = mockDb.reactions.find((r) => r.statementId === statementId && r.userId === u.id);
    if (row) {
      if (payload.viewed !== undefined) row.viewed = payload.viewed;
      if (payload.reaction !== undefined) row.reaction = payload.reaction ?? undefined;
      row.updatedAt = new Date();
    } else {
      mockDb.reactions.push({ id: randomId('react'), statementId, userId: u.id, userName: u.name, viewed: payload.viewed === true, reaction: payload.reaction ?? undefined, createdAt: new Date(), updatedAt: new Date(), deletedAt: null, isActive: true });
    }
    const st = mockDb.statements.find((s) => s.id === statementId);
    if (st && payload.viewed !== undefined) st.viewed = payload.viewed;
    return { error: null };
  },

  async createStatement(payload: {
    title: string;
    image_url: string;
    caption?: string | null;
    tags: string[];
    is_oficial?: boolean;
    user_id: string;
    creator_name?: string | null;
  }) {
    const titleErr = validateStatementTitle(payload.title.trim());
    const capErr = validateStatementCaption(payload.caption?.trim() ?? '');
    if (titleErr || capErr) return { data: null, error: new Error(titleErr || capErr || 'Dados inválidos') };
    const item: Statement = { id: randomId('st'), title: payload.title.trim(), imageUrl: payload.image_url, caption: payload.caption ?? undefined, tags: payload.tags ?? [], isOfficial: payload.is_oficial === true, publishedAt: new Date(), userId: payload.user_id, creatorName: payload.creator_name ?? uiShellUser.name, creatorAvatarUrl: uiShellUser.avatar, viewed: false };
    mockDb.statements.unshift(item);
    return { data: item, error: null };
  },

  async updateStatement(id: string, payload: { title?: string; image_url?: string; caption?: string | null; tags?: string[]; is_oficial?: boolean; is_archived?: boolean }) {
    const row = mockDb.statements.find((s) => s.id === id);
    if (!row) return { data: null, error: { message: 'Not found' } };
    if (payload.title !== undefined) row.title = payload.title;
    if (payload.image_url !== undefined) row.imageUrl = payload.image_url;
    if (payload.caption !== undefined) row.caption = payload.caption ?? undefined;
    if (payload.tags !== undefined) row.tags = payload.tags;
    if (payload.is_oficial !== undefined) row.isOfficial = payload.is_oficial;
    if (payload.is_archived !== undefined) row.isArchived = payload.is_archived;
    return { data: row, error: null };
  },

  async deleteStatement(id: string) { mockDb.statements = mockDb.statements.filter((s) => s.id !== id); return { error: null }; },

  /** Canais de solicitação do workspace atual (company_profile.ge_teams_workspace). */
  async listRequestChannels() { return { data: [...mockDb.requestChannels], error: null as null }; },

  async createRequestChannel(payload: {
    name: string;
    icon_url?: string | null;
    url?: string | null;
    channel_type: RequestChannelType;
    description?: string | null;
    color?: string | null;
    /** Nome do workspace (mock). */
    workspace: string;
    /** Uuid de workspace (mock). */
    workspace_id?: string | null;
  }) {
    const item: RequestChannel = { id: randomId('channel'), name: payload.name, icon: payload.icon_url ?? '', url: payload.url ?? '#', channel_type: payload.channel_type, description: payload.description ?? undefined, color: payload.color ?? undefined, workspace: payload.workspace, workspaceId: payload.workspace_id ?? undefined };
    mockDb.requestChannels.push(item);
    return { data: item, error: null };
  },

  async deleteRequestChannel(id: string) { mockDb.requestChannels = mockDb.requestChannels.filter((c) => c.id !== id); return { error: null }; },

  /** Equipes do workspace atual (company_profile.ge_teams_workspace / geteams_workspace_id). */
  async listTeams(options?: { activeOnly?: boolean }) {
    const list = options?.activeOnly ? mockDb.teams.filter((t) => t.status === 'active') : mockDb.teams;
    return { data: [...list], error: null as null };
  },

  async createTeam(payload: {
    name: string;
    neon_department_id: string;
    status?: TeamLifecycleStatus;
    workspace_name: string;
    workspace_id?: string | null;
  }) {
    const team: Team = { id: randomId('team'), name: payload.name, status: payload.status ?? 'active', neonDepartmentId: payload.neon_department_id, workspaceName: payload.workspace_name, workspaceId: payload.workspace_id ?? undefined, createdAt: new Date() };
    mockDb.teams.push(team);
    return { data: team, error: null };
  },

  async updateTeamStatus(teamId: string, status: TeamLifecycleStatus) {
    const team = mockDb.teams.find((t) => t.id === teamId);
    if (!team) return { data: null, error: { message: 'Team not found' } };
    team.status = status;
    team.updatedAt = new Date();
    return { data: team, error: null };
  },
};

// Chat Service
export const chatService = {
  async getConversations(userId: string) {
    const list = mockDb.conversations.filter((c) => c.participantIds.includes(userId)).map((c) => {
      const participants = c.participantIds.filter((id) => id !== userId).map((id) => mockDb.profiles.find((u) => u.id === id)).filter(Boolean).map((u) => ({ id: (u as UserProfile).id, name: (u as UserProfile).name, email: (u as UserProfile).email, avatar: (u as UserProfile).avatar }));
      const last = mockDb.messages.filter((m) => m.conversation_id === c.id).slice(-1)[0];
      return { ...c, participants, last_message: last ? { content: last.content, created_at: last.created_at, sender_id: last.sender_id } : undefined };
    });
    return { data: list, error: null };
  },

  async getOrCreateConversation(userId: string, otherUserId: string) {
    let conv = mockDb.conversations.find((c) => c.participantIds.includes(userId) && c.participantIds.includes(otherUserId));
    if (!conv) {
      const now = new Date().toISOString();
      conv = { id: randomId('conv'), created_at: now, updated_at: now, participantIds: [userId, otherUserId] };
      mockDb.conversations.push(conv);
    }
    return { data: conv, error: null };
  },

  async getMessages(conversationId: string, limit = 100) { return { data: mockDb.messages.filter((m) => m.conversation_id === conversationId).slice(-limit), error: null }; },

  async sendMessage(conversationId: string, senderId: string, content: string) {
    const msg = { id: randomId('msg'), conversation_id: conversationId, sender_id: senderId, content, created_at: new Date().toISOString() };
    mockDb.messages.push(msg);
    return { data: msg, error: null };
  },

  subscribeToMessages(_conversationId: string, _onMessage: (payload: any) => void) {
    return { unsubscribe() {} };
  },
};
