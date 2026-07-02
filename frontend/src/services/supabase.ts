import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ProfileThema } from '@/lib/themeMapping';
import type { SidebarMode } from '@/lib/sidebarMode';
import type { Category, User } from '@/types';
import { gechatApi } from '@/modules/gechat/services/gechat-api';

export const GEADS_APP_ID = '00000000-0000-4000-8000-000000000002' as const;

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
  workspace?: string;
  workspaceId?: string;
}

export type TeamLifecycleStatus = 'active' | 'archived' | 'deleted';

export interface Team {
  id: string;
  name: string;
  status: TeamLifecycleStatus;
  neonDepartmentId: string;
  createdAt?: Date;
  updatedAt?: Date;
  workspaceName?: string;
  workspaceId?: string;
}

export interface Statement {
  id: string;
  title: string;
  imageUrl: string;
  caption?: string;
  tags: string[];
  isOfficial?: boolean;
  publishedAt: Date;
  userId: string;
  creatorName?: string;
  creatorAvatarUrl?: string;
  isArchived?: boolean;
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

export const MAX_FAVORITE_APPS_PER_USER = 5;
export const FAVORITE_LIMIT_ERROR_CODE = 'FAVORITE_LIMIT' as const;

type UserProfile = User & {
  full_name?: string;
  banner_url?: string | null;
  profession?: string | null;
  birth_date?: string | null;
  hire_date?: string | null;
};

let currentUser: UserProfile | null = null;
let supabaseClient: SupabaseClient | null = null;
let supabaseClientPromise: Promise<SupabaseClient | null> | null = null;
let supabaseClientCreatedAt = 0;
// Token do /api/auth/access-token expira; renovar o cliente antes disso.
const SUPABASE_CLIENT_TTL_MS = 10 * 60 * 1000;
const listeners = new Set<(event: string) => void>();

function resetSupabaseClient() {
  supabaseClient = null;
  supabaseClientPromise = null;
  supabaseClientCreatedAt = 0;
}

function notifyAuth(event: string) {
  listeners.forEach((cb) => cb(event));
}

function normalizeAccessType(value: unknown): 'user' | 'admin' {
  return String(value ?? 'user').toLowerCase() === 'admin' ? 'admin' : 'user';
}

function mapUser(row: UserProfile): User {
  const accessType = normalizeAccessType(row.accessType);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: accessType,
    avatar: row.avatar,
    createdAt: row.createdAt,
    accessType,
    profileStatus: row.profileStatus,
    sidebar: row.sidebar,
  };
}

export type ChatProfile = {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
};

function mapProfileRowToChatUser(row: Record<string, unknown>): ChatProfile | null {
  const id = String(row.user_id ?? row.id ?? '').trim();
  if (!id) return null;
  const email = row.email ? String(row.email) : undefined;
  const name = String(row.name ?? email?.split('@')[0] ?? 'Usuário');
  const avatarRaw = row.avatar_url ?? row.avatar;
  return {
    id,
    name,
    email,
    avatar: avatarRaw ? String(avatarRaw) : undefined,
  };
}

function isActiveProfileRow(row: Record<string, unknown>) {
  const status = String(row.profile_status ?? row.profileStatus ?? 'active').trim().toLowerCase();
  return !status || status === 'active';
}

function apiError(message: string) {
  return { message };
}

const API_FETCH_TIMEOUT_MS = 8000;

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<{ data: T | null; error: any }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(path, {
      ...options,
      credentials: 'include',
      signal: controller.signal,
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
  } finally {
    clearTimeout(timeout);
  }
}

function setCurrentUserFromApi(user: UserProfile | null | undefined) {
  const prevId = currentUser?.id ?? null;
  currentUser = user ? { ...user, createdAt: user.createdAt ? new Date(user.createdAt) : new Date() } : null;
  const nextId = currentUser?.id ?? null;
  // Só descarta o cliente quando o usuário muda de fato (login/logout/troca),
  // não a cada getUser()/getSession() — recriar dispara novo fetch de token.
  if (prevId !== nextId) resetSupabaseClient();
}

async function getSupabaseClient(): Promise<SupabaseClient | null> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (supabaseClient && Date.now() - supabaseClientCreatedAt < SUPABASE_CLIENT_TTL_MS) {
    return supabaseClient;
  }
  if (!supabaseClientPromise) {
    supabaseClientPromise = (async () => {
      const { data } = await apiFetch<{ accessToken: string }>('/api/auth/access-token');
      if (!data?.accessToken) return null;
      supabaseClient = createClient(url, key, {
        // Auth é do backend (cookie); sem sessão própria não há GoTrueClient
        // disputando a mesma storage key entre instâncias.
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
      });
      supabaseClientCreatedAt = Date.now();
      return supabaseClient;
    })().finally(() => {
      supabaseClientPromise = null;
    });
  }
  return supabaseClientPromise;
}

const serverAuth = {
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const { data, error } = await apiFetch<{ user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setCurrentUserFromApi(data?.user);
    notifyAuth(error ? 'SIGNED_OUT' : 'SIGNED_IN');
    return { data: { user: data?.user ?? null, session: data?.user ? { access_token: 'cookie' } : null }, error };
  },

  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, any> } }) {
    const fullName = String(options?.data?.full_name ?? options?.data?.name ?? '');
    const role = String(options?.data?.role ?? 'user');
    const { data, error } = await apiFetch<{ user: UserProfile }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName, role }),
    });
    setCurrentUserFromApi(data?.user);
    notifyAuth(error ? 'SIGNED_OUT' : 'SIGNED_IN');
    return { data: { user: data?.user ?? null, session: data?.user ? { access_token: 'cookie' } : null }, error };
  },

  async signOut() {
    const { error } = await apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
    setCurrentUserFromApi(null);
    notifyAuth('SIGNED_OUT');
    return { error };
  },

  async getUser() {
    const { data, error } = await apiFetch<{ user: UserProfile | null }>('/api/auth/me');
    setCurrentUserFromApi(data?.user);
    return { data: { user: data?.user ?? null }, error };
  },

  async getSession() {
    const { data, error } = await apiFetch<{ user: UserProfile | null }>('/api/auth/me');
    setCurrentUserFromApi(data?.user);
    return { data: { session: data?.user ? { access_token: 'cookie' } : null }, error };
  },

  async resetPasswordForEmail(email: string, options?: { redirectTo?: string }) {
    return apiFetch('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, redirectTo: options?.redirectTo }),
    });
  },

  async updateUser(payload: { password?: string }) {
    const { data, error } = await apiFetch<{ user: UserProfile | null }>('/api/auth/password', {
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

export const supabase = {
  auth: serverAuth,
  storage: {
    from(bucket: string) {
      return {
        async upload(path: string, file: File, options?: { upsert?: boolean }) {
          const client = await getSupabaseClient();
          if (!client) return { data: null, error: { message: 'Storage indisponível.' } };
          return client.storage.from(bucket).upload(path, file, {
            upsert: options?.upsert ?? true,
            contentType: file.type || 'application/octet-stream',
          });
        },
        getPublicUrl(path: string) {
          const url = import.meta.env.VITE_SUPABASE_URL;
          return { data: { publicUrl: url ? `${url}/storage/v1/object/public/${bucket}/${path}` : path } };
        },
        async remove(paths: string[]) {
          const client = await getSupabaseClient();
          if (!client) return { error: { message: 'Storage indisponível.' } };
          return client.storage.from(bucket).remove(paths);
        },
      };
    },
  },
  from(table: string) {
    const ops: Array<{ op: string; args: unknown[] }> = [];

    const execute = async () => {
      const client = await getSupabaseClient();
      if (!client) throw new Error('Supabase indisponível.');
      let q: any = client.from(table);
      for (const { op, args } of ops) {
        const fn = q[op];
        if (typeof fn !== 'function') {
          throw new TypeError(`Supabase: "${op}" não é método válido nesta etapa da query`);
        }
        q = fn.apply(q, args);
      }
      return q;
    };

    const proxy: any = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'then') {
            return (onFulfilled: any, onRejected: any) =>
              execute().then(onFulfilled, onRejected);
          }
          if (prop === 'catch') {
            return (onRejected: any) => execute().catch(onRejected);
          }
          if (prop === 'finally') {
            return (onFinally: any) => execute().finally(onFinally);
          }
          if (typeof prop === 'symbol') return undefined;
          return (...args: any[]) => {
            ops.push({ op: String(prop), args });
            return proxy;
          };
        },
      },
    );
    return proxy;
  },
  async rpc(fn: string, args?: Record<string, unknown>) {
    const client = await getSupabaseClient();
    if (!client) return { data: null, error: { message: 'Supabase indisponível.' } };
    return client.rpc(fn, args);
  },
  channel(_name: string) {
    return { on() { return this; }, subscribe() { return { unsubscribe() {} }; } };
  },
};

export const GECHAT_STORAGE_BUCKET = 'GeChat' as const;

/** Supabase Storage rejeita alguns caracteres em nomes de arquivo (ex.: acentos). */
export function sanitizeStorageFileName(fileName: string) {
  const trimmed = fileName.trim() || 'arquivo';
  const dot = trimmed.lastIndexOf('.');
  const ext = dot > 0 ? trimmed.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, '') : '';
  const base = (dot > 0 ? trimmed.slice(0, dot) : trimmed)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'arquivo';
  return `${base}${ext}`;
}

async function uploadToGeChatStorage(path: string, file: File) {
  const client = await getSupabaseClient();
  if (!client) return { url: null, error: { message: 'Storage indisponível.' } };

  const { data, error } = await client.storage.from(GECHAT_STORAGE_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
  });

  if (error) return { url: null, error };

  const { data: urlData } = client.storage.from(GECHAT_STORAGE_BUCKET).getPublicUrl(data?.path ?? path);
  return { url: urlData.publicUrl, error: null };
}

export const storageService = {
  async uploadAvatar(userId: string, file: File) {
    const path = `avatars/${userId}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from('GeImage').upload(path, file);
    if (error) return { url: null, error };
    const { data: urlData } = supabase.storage.from('GeImage').getPublicUrl(data?.path ?? path);
    return { url: urlData.publicUrl, error: null };
  },
  async deleteAvatar(url: string) {
    void url;
    return { error: null };
  },
  async uploadSystemImage(file: File) {
    const path = `GeChat/systems/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from('GeImage').upload(path, file);
    if (error) return { url: null, error };
    const { data: urlData } = supabase.storage.from('GeImage').getPublicUrl(data?.path ?? path);
    return { url: urlData.publicUrl, error: null };
  },
  async uploadRequestChannelIcon(file: File) {
    const path = `channels/${Date.now()}-${sanitizeStorageFileName(file.name)}`;
    return uploadToGeChatStorage(path, file);
  },
  async uploadGroupAvatar(userId: string, file: File) {
    const path = `groups/${userId}/${Date.now()}-${sanitizeStorageFileName(file.name)}`;
    return uploadToGeChatStorage(path, file);
  },
  async uploadSystemAnchorPdf(file: File) {
    const path = `GeChat/anchor/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from('Files').upload(path, file);
    if (error) return { url: null, error };
    const { data: urlData } = supabase.storage.from('Files').getPublicUrl(data?.path ?? path);
    return { url: urlData.publicUrl, error: null };
  },
  async uploadComunicadoImage(file: File, userId?: string) {
    const path = `GeChat/comunicados/${userId ?? 'anon'}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from('GeImage').upload(path, file);
    if (error) return { url: null, error };
    const { data: urlData } = supabase.storage.from('GeImage').getPublicUrl(data?.path ?? path);
    return { url: urlData.publicUrl, error: null };
  },
  async uploadChatImage(file: File, conversationId: string, userId: string) {
    const path = `messages/${conversationId}/${userId}/images/${Date.now()}-${sanitizeStorageFileName(file.name)}`;
    return uploadToGeChatStorage(path, file);
  },
  async uploadChatFile(file: File, conversationId: string, userId: string) {
    const path = `messages/${conversationId}/${userId}/files/${Date.now()}-${sanitizeStorageFileName(file.name)}`;
    return uploadToGeChatStorage(path, file);
  },
};

export const authService = {
  async signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },
  async signUp(email: string, password: string, fullName: string, role: 'admin' | 'creator' | 'user' = 'user') {
    return supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, name: fullName, role } } } as any);
  },
  async signOut() {
    currentUser = null;
    resetSupabaseClient();
    return supabase.auth.signOut();
  },
  async resetPasswordForEmail(email: string, redirectTo?: string) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`,
    });
  },
  async getSession() {
    return supabase.auth.getSession();
  },
  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      currentUser = null;
      return { data: null, error };
    }
    setCurrentUserFromApi(data.user as UserProfile);
    return { data: currentUser ? mapUser(currentUser) : null, error: null };
  },
};

const empty = { data: [] as any[], error: null as null };
const emptyData = { data: null as any, error: null as null };

export const databaseService = {
  async updateProfileThema(_userId: string, _thema: ProfileThema) {
    return { error: null };
  },
  async updateProfileSidebar(_userId: string, _sidebar: SidebarMode) {
    return { error: null };
  },
  async getCompanyProfile(..._args: any[]) { return emptyData; },
  async saveCompanyProfile(..._args: any[]) { return { error: null }; },
  async getUsers() {
    const client = await getSupabaseClient();
    if (!client) return empty;
    const { data, error } = await client.from('profiles').select('*');
    if (error) return { data: [], error };
    return { data: (data ?? []).map((r) => mapUser(r as UserProfile)), error: null };
  },
  /** Perfis ativos em `public.profiles` para iniciar conversas no GêChat. */
  async listChatProfiles(excludeUserId?: string) {
    const client = await getSupabaseClient();
    if (!client) return { data: [] as ChatProfile[], error: apiError('Supabase indisponível.') };

    const { data, error } = await client
      .from('profiles')
      .select('user_id, id, full_name, name, email, avatar_url, avatar, profile_status, apelido')
      .order('full_name', { ascending: true, nullsFirst: false });

    if (error) return { data: [], error };

    const users = (data ?? [])
      .filter((row) => isActiveProfileRow(row as Record<string, unknown>))
      .map((row) => mapProfileRowToChatUser(row as Record<string, unknown>))
      .filter((u): u is ChatProfile => !!u && u.id !== excludeUserId)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    return { data: users, error: null };
  },
  async getAdministrators() {
    const { data } = await this.getUsers();
    return { data: data.filter((u) => u.accessType === 'admin'), error: null };
  },
  async getAppsAdmins() { return this.getAdministrators(); },
  async searchProfiles(query: string) {
    const client = await getSupabaseClient();
    if (!client || query.trim().length < 2) return empty;
    const q = `%${query.trim()}%`;
    const { data, error } = await client.from('profiles').select('id, full_name, name, email, avatar_url').or(`full_name.ilike.${q},email.ilike.${q}`);
    if (error) return empty;
    return { data: (data ?? []).map((r: any) => ({ id: r.id ?? r.user_id, name: r.full_name ?? r.name, email: r.email, avatar: r.avatar_url })), error: null };
  },
  async getAdminCounts() {
    const { data: users } = await this.getUsers();
    return { users: users.length, softadmins: users.filter((u) => u.accessType === 'admin').length, apps: 0, activeApps: 0 };
  },
  async getTotalAccessCount() {
    const client = await getSupabaseClient();
    if (!client) return 0;
    const { count } = await client.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'app_access_daily');
    return count ?? 0;
  },
  async getUserAccessCount(userId: string) {
    const client = await getSupabaseClient();
    if (!client) return 0;
    const { count } = await client.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'app_access_daily').eq('actor_user_id', userId);
    return count ?? 0;
  },
  async getUserForegroundScreenTimeMsForGeAds(userId: string) {
    const client = await getSupabaseClient();
    if (!client) return 0;
    const slug = (import.meta.env.VITE_GECHAT_AUDIT_SLUG ?? 'gechat').toLowerCase();
    const { data: app } = await client.from('apps').select('id').eq('slug', slug).maybeSingle();
    if (!app?.id) return 0;
    const { data } = await client.from('audit_logs').select('screen_time_ms').eq('actor_user_id', userId).eq('app_id', app.id).eq('action', 'screen_time_active');
    return (data ?? []).reduce((sum, row) => sum + (Number(row.screen_time_ms) || 0), 0);
  },
  async getGeAdsExplicitAccess() { return { data: true, error: null }; },
  async getAccessLogsAll(limit = 500) { return this.getAccessLogs(undefined, limit); },
  async getUserById(userId: string) {
    const client = await getSupabaseClient();
    if (!client) return emptyData;
    const { data, error } = await client.from('profiles').select('*').eq('user_id', userId).maybeSingle();
    if (error || !data) return { data: null, error: error ?? { message: 'Profile not found' } };
    return { data: { ...data, full_name: data.full_name ?? data.name, avatar_url: data.avatar_url }, error: null };
  },
  async getProfileForPopupByUserId(userId: string) { return this.getUserById(userId); },
  async getProfileForPopupByEmail(email: string) {
    const client = await getSupabaseClient();
    if (!client) return emptyData;
    const { data, error } = await client.from('profiles').select('*').ilike('email', email).maybeSingle();
    if (error || !data) return { data: null, error: error ?? { message: 'Profile not found' } };
    return { data: { ...data, full_name: data.full_name ?? data.name, avatar_url: data.avatar_url }, error: null };
  },
  async getRawProfileByEmail(email: string) { return this.getProfileForPopupByEmail(email); },
  async getUserByEmail(email: string) {
    const { data } = await this.getProfileForPopupByEmail(email);
    return { data: data ? mapUser(data as UserProfile) : null, error: null };
  },
  async profilesEmailExists(email: string) {
    const { data } = await this.getProfileForPopupByEmail(email);
    return !!data;
  },
  async createUser(..._args: any[]) { return emptyData; },
  async updateUser(userId: string, userData: any) {
    const client = await getSupabaseClient();
    if (!client) return emptyData;
    const { data, error } = await client.from('profiles').update(userData).eq('user_id', userId).select('*').maybeSingle();
    if (error || !data) return { data: null, error };
    return { data: mapUser(data as UserProfile), error: null };
  },
  async deleteUser(..._args: any[]) { return { error: null }; },
  appRowToSystem(row: any) { return row; },
  async getSystems(..._args: any[]) { return empty; },
  async getSystemById(..._args: any[]) { return emptyData; },
  async getAppBySlug(slug: string) {
    const client = await getSupabaseClient();
    if (!client) return emptyData;
    const needle = slug.toLowerCase().replace(/\s+/g, '');
    const exact = await client.from('apps').select('*').eq('slug', needle).maybeSingle();
    if (exact.error) return { data: null, error: exact.error };
    if (exact.data?.id) return { data: exact.data, error: null };
    const fuzzy = await client.from('apps').select('*').ilike('slug', needle).maybeSingle();
    if (fuzzy.error) return { data: null, error: fuzzy.error };
    return { data: fuzzy.data ?? null, error: null };
  },
  async userHasAccessToApp(..._args: any[]) { return { data: false, error: null }; },
  async userHasAccessToAppBySlug(..._args: any[]) { return { data: false, error: null }; },
  async getSystemsForMember(..._args: any[]) { return empty; },
  async createSystem(..._args: any[]) { return emptyData; },
  async updateSystem(..._args: any[]) { return emptyData; },
  async deleteSystem(..._args: any[]) { return { error: null }; },
  async getUserSystemAccess(..._args: any[]) { return empty; },
  async getUsersWithAccessToApp(..._args: any[]) { return empty; },
  async setUserSystemAccess(..._args: any[]) { return emptyData; },
  async countActiveFavoriteApps(..._args: any[]) { return { count: 0, error: null }; },
  async toggleFavorite(..._args: any[]) { return emptyData; },
  async getAccessLogs(userId?: string, limit = 50) {
    const client = await getSupabaseClient();
    if (!client) return empty;
    let q = client.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (userId) q = q.eq('actor_user_id', userId);
    const { data, error } = await q;
    return { data: data ?? [], error };
  },
  async getCategories(..._args: any[]) { return empty; },
  async createCategory(..._args: any[]) { return emptyData; },
  async updateCategory(..._args: any[]) { return emptyData; },
  async deleteCategory(..._args: any[]) { return { error: null }; },
  async listStatements(..._args: any[]) { return empty; },
  async markStatementViewed(..._args: any[]) { return { error: null }; },
  async hasUnviewedStatementsForCurrentUser(..._args: any[]) { return false; },
  async listStatementReactions(..._args: any[]) { return empty; },
  async listStatementReactionsWithUsers(..._args: any[]) { return empty; },
  async countActiveStatementComments(..._args: any[]) { return { count: 0, error: null }; },
  async listStatementComments(..._args: any[]) { return empty; },
  async addStatementComment(..._args: any[]) { return emptyData; },
  async deleteStatementComment(..._args: any[]) { return { error: null }; },
  async upsertStatementReaction(..._args: any[]) { return { error: null }; },
  async createStatement(..._args: any[]) { return emptyData; },
  async updateStatement(..._args: any[]) { return emptyData; },
  async deleteStatement(..._args: any[]) { return { error: null }; },
  async listRequestChannels(..._args: any[]) { return empty; },
  async createRequestChannel(..._args: any[]) { return emptyData; },
  async deleteRequestChannel(..._args: any[]) { return { error: null }; },
  async listTeams(..._args: any[]) { return empty; },
  async createTeam(..._args: any[]) { return emptyData; },
  async updateTeamStatus(..._args: any[]) { return emptyData; },
};

export const chatService = {
  async getConversations() {
    try {
      return { data: await gechatApi.getConversations(), error: null };
    } catch (error) {
      return { data: [] as any[], error };
    }
  },
  async getOrCreateConversation(targetUserId: string) {
    try {
      return { data: await gechatApi.createDirect(targetUserId), error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  async getMessages(conversationId: string) {
    try {
      const { messages } = await gechatApi.getMessages(conversationId);
      return { data: messages, error: null };
    } catch (error) {
      return { data: [] as any[], error };
    }
  },
  async sendMessage(conversationId: string, content: string) {
    try {
      const { gechatSocket } = await import('@/lib/realtime/socket-client');
      const result = await gechatSocket.sendMessage({ conversationId, content });
      return { data: result.message ?? null, error: result.ok ? null : result.error };
    } catch (error) {
      return { data: null, error };
    }
  },
  subscribeToMessages() {
    return { unsubscribe() {} };
  },
};
