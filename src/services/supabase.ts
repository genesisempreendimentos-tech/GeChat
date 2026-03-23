// Supabase Service Layer
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ProfileThema } from '@/lib/themeMapping';
import type { SidebarMode } from '@/lib/sidebarMode';
import { parseSidebarMode } from '@/lib/sidebarMode';
import { getAuthStorage } from './authStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasCredentials = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasCredentials) {
  console.warn(
    '⚠️ Supabase credentials not found. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (e.g. in Vercel → Project → Settings → Environment Variables).'
  );
}

/** Client real quando há credenciais; senão um proxy que lança erro claro ao ser usado (evita "supabaseUrl is required" no load). */
function createSupabaseClient(): SupabaseClient {
  if (hasCredentials) {
    const storage = getAuthStorage();
    return createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { storage },
    });
  }
  return new Proxy({} as SupabaseClient, {
    get() {
      throw new Error(
        'Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente (ex.: Vercel → Settings → Environment Variables).'
      );
    },
  });
}

export const supabase = createSupabaseClient();

/**
 * Tabela Supabase para canais de solicitação (criar no dashboard quando for aplicar o SQL).
 * RLS sugerida (após migração): SELECT para autenticados; INSERT/UPDATE/DELETE apenas appsadmin.
 */
export const REQUEST_CHANNELS_TABLE = 'request_channels';

/** Equipes (tabela `teams`) — ver migration-teams-table.sql */
export const TEAMS_TABLE = 'teams';

/** Comunicados internos (tabela `statement`). */
export const STATEMENT_TABLE = 'statement';
/** Reações/visualização por utilizador em comunicados (tabela `statement_reaction`). */
export const STATEMENT_REACTION_TABLE = 'statement_reaction';

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
}

type RequestChannelRow = {
  id: string;
  name: string;
  icon_url?: string | null;
  url?: string | null;
  channel_type?: string | null;
  description?: string | null;
  color?: string | null;
  created_at?: string;
};

/** Ciclo de vida da equipe no GêApps (coluna `teams.status`). */
export type TeamLifecycleStatus = 'active' | 'archived' | 'deleted';

export interface Team {
  id: string;
  name: string;
  status: TeamLifecycleStatus;
  neonDepartmentId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type TeamRow = {
  id: string;
  name: string;
  status?: string | null;
  /** Legado (antes de migration-teams-status-upgrade.sql). */
  is_active?: boolean | null;
  neon_department_id: string;
  created_at?: string;
  updated_at?: string;
};

function normalizeTeamStatus(row: TeamRow): TeamLifecycleStatus {
  const raw = String(row.status ?? '').trim().toLowerCase();
  if (raw === 'active' || raw === 'archived' || raw === 'deleted') return raw;
  if (row.is_active === false) return 'archived';
  return 'active';
}

function teamRowToApp(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name ?? '',
    status: normalizeTeamStatus(row),
    neonDepartmentId: row.neon_department_id ?? '',
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  };
}

function requestChannelRowToApp(row: RequestChannelRow): RequestChannel {
  const raw = String(row.channel_type ?? 'departamento').toLowerCase();
  const channel_type: RequestChannelType = raw === 'setor' ? 'setor' : 'departamento';
  return {
    id: row.id,
    name: row.name ?? '',
    icon: row.icon_url ?? '',
    url: row.url ?? '',
    channel_type,
    description: row.description ?? undefined,
    color: row.color ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
  };
}

export interface Statement {
  id: string;
  title: string;
  imageUrl: string;
  caption?: string;
  tags: string[];
  publishedAt: Date;
  userId: string;
  /** Vem da relação por utilizador na tabela `statement_reaction`. */
  viewed: boolean;
}

type StatementRow = {
  id: string;
  title: string;
  image_url: string;
  caption?: string | null;
  tags?: string[] | null;
  published_at: string;
  user_id: string;
  created_at?: string;
  /** Coluna legado opcional na tabela `statement` (não usada no fluxo novo). */
  viewed?: boolean | null;
};

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

type StatementReactionRow = {
  id: string;
  statement_id: string;
  user_id: string;
  user_name?: string | null;
  viewed?: boolean | null;
  reaction?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  is_active?: boolean | null;
};

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

type StatementCommentRow = {
  id: string;
  statement_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  is_active: boolean;
};

function statementRowToApp(row: StatementRow): Statement {
  return {
    id: row.id,
    title: row.title ?? '',
    imageUrl: row.image_url ?? '',
    caption: row.caption ?? undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    publishedAt: row.published_at ? new Date(row.published_at) : new Date(),
    userId: row.user_id,
    viewed: row.viewed === true,
  };
}

function statementReactionRowToApp(row: StatementReactionRow): StatementReaction {
  return {
    id: row.id,
    statementId: row.statement_id,
    userId: row.user_id,
    userName: (row.user_name ?? '').trim(),
    viewed: row.viewed === true,
    reaction: row.reaction ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    isActive: row.is_active !== false,
  };
}

function statementCommentRowToApp(row: StatementCommentRow): StatementComment {
  return {
    id: row.id,
    statementId: row.statement_id,
    userId: row.user_id,
    content: row.content,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    isActive: row.is_active !== false,
  };
}

/** Máximo de aplicativos favoritos por usuário (regra de negócio + validação em toggleFavorite). */
export const MAX_FAVORITE_APPS_PER_USER = 5;

/** Código retornado em `error` quando o usuário tenta exceder MAX_FAVORITE_APPS_PER_USER. */
export const FAVORITE_LIMIT_ERROR_CODE = 'FAVORITE_LIMIT' as const;

// Mapeamento: tabelas do Supabase (profiles, apps, user_app_access, audit_logs) <-> formato do app (User, System)
type ProfileRow = {
  id?: string;
  user_id?: string;
  full_name?: string;
  name?: string;
  avatar_url?: string;
  avatar?: string;
  role?: string;
  role_type?: string;
  user_type?: string;
  email?: string;
  created_at?: string;
  access_type?: string;
  /** Conta ativa ou arquivada (soft) no painel admin. */
  profile_status?: string | null;
  thema?: string | null;
  sidebar?: string | null;
};

function normalizeProfileStatus(raw: string | null | undefined): 'active' | 'archived' | 'deleted' {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (v === 'archived' || v === 'arquivado') return 'archived';
  if (v === 'deleted' || v === 'excluido' || v === 'excluído') return 'deleted';
  return 'active';
}
type UserShape = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  created_at?: string;
  createdAt?: Date;
  accessType?: string;
  profileStatus?: 'active' | 'archived' | 'deleted';
  thema?: string | null;
  sidebar?: SidebarMode;
};
type CategoryRow = { id: string; name: string; description?: string; icon?: string; color?: string; created_at?: string; updated_at?: string; status?: string };

function profileToUser(row: ProfileRow | null, authEmail?: string): UserShape | null {
  if (!row) return null;
  const id = row.id ?? row.user_id ?? '';
  const rawAccessType = (row.access_type ?? row.role ?? row.role_type ?? row.user_type ?? 'user').toString().trim();
  const normalizedAccessType = rawAccessType ? rawAccessType.toLowerCase() : 'user';
  const role = normalizedAccessType === 'manager' ? 'user' : normalizedAccessType;
  return {
    id,
    name: (row.full_name ?? row.name) ?? '',
    email: row.email ?? authEmail ?? '',
    role,
    avatar: row.avatar_url ?? row.avatar,
    created_at: row.created_at,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    accessType: role,
    profileStatus: normalizeProfileStatus(row.profile_status),
    thema: row.thema ?? undefined,
    sidebar: parseSidebarMode(row.sidebar ?? undefined),
  };
}

function userToProfilePayload(user: { name: string; email: string; role: string; avatar?: string }) {
  return {
    full_name: user.name,
    avatar_url: user.avatar,
    access_type: user.role,
    email: user.email,
  };
}

// Ícones em public/assets/systems — slug (normalizado) -> nome do arquivo na pasta
const SYSTEMS_ICONS: Record<string, string> = {
  geforms: 'GeForms.png',
  geroute: 'GêRoute.png',
  getask: 'GêTask.png',
  geteam: 'GeTeam.png',
  geapps: 'GêApps.png',
  gestack: 'GeStack.png',
};
const SYSTEMS_ICONS_DEFAULT = 'GêApps.png';

function normalizeSlug(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function resolveSystemIcon(row: any): string {
  const slug = normalizeSlug(row.slug ?? row.name ?? row.title ?? '');
  const mappedFile = slug ? (SYSTEMS_ICONS[slug] ?? SYSTEMS_ICONS_DEFAULT) : SYSTEMS_ICONS_DEFAULT;
  const base = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL.replace(/\/$/, '') : '';
  return `${base}/assets/systems/${mappedFile}`;
}

/** Usa icon_url do banco (URL pública do Supabase) quando existir; senão usa ícone local por slug. */
function getSystemIcon(row: any): string {
  const stored = row.icon_url ?? row.icon ?? row.logo;
  if (stored && typeof stored === 'string' && (stored.startsWith('http') || stored.startsWith('https'))) {
    return stored;
  }
  return resolveSystemIcon(row);
}

// Storage Service
export const storageService = {
  async uploadAvatar(userId: string, file: File) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `profile/${fileName}`;

      console.log('📤 [Storage] Uploading avatar:', { userId, fileName, size: file.size });

      const { data, error } = await supabase.storage
        .from('GeImage')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('❌ [Storage] Upload error:', error);
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from('GeImage')
        .getPublicUrl(filePath);

      console.log('✅ [Storage] Avatar uploaded:', publicUrlData.publicUrl);
      return { url: publicUrlData.publicUrl, error: null };
    } catch (error) {
      console.error('❌ [Storage] Exception:', error);
      return { url: null, error };
    }
  },

  async deleteAvatar(url: string) {
    try {
      const pathAfterBucket = url.split('/GeImage/')[1];
      if (!pathAfterBucket) return { error: 'Invalid URL' };
      const filePath = decodeURIComponent(pathAfterBucket.split('?')[0]);

      const { error } = await supabase.storage
        .from('GeImage')
        .remove([filePath]);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('❌ [Storage] Delete error:', error);
      return { error };
    }
  },

  /** Upload de imagem do sistema/app para o bucket GeImage, pasta GeApps. Retorna a URL pública. */
  async uploadSystemImage(file: File): Promise<{ url: string | null; error: unknown }> {
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 80);
      const fileName = `${Date.now()}-${safeName}`;
      const filePath = `GeApps/${fileName}`;

      const { error } = await supabase.storage
        .from('GeImage')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.error('❌ [Storage] System image upload error:', error);
        return { url: null, error };
      }

      const { data: publicUrlData } = supabase.storage
        .from('GeImage')
        .getPublicUrl(filePath);

      return { url: publicUrlData.publicUrl, error: null };
    } catch (err) {
      console.error('❌ [Storage] uploadSystemImage exception:', err);
      return { url: null, error: err };
    }
  },

  /** Ícone de canal de solicitação — pasta dedicada no bucket GeImage. */
  async uploadRequestChannelIcon(file: File): Promise<{ url: string | null; error: unknown }> {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 80);
      const fileName = `${Date.now()}-${safeName}`;
      const filePath = `GeApps/request-channels/${fileName}`;

      const { error } = await supabase.storage
        .from('GeImage')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.error('❌ [Storage] Request channel icon upload error:', error);
        return { url: null, error };
      }

      const { data: publicUrlData } = supabase.storage.from('GeImage').getPublicUrl(filePath);
      return { url: publicUrlData.publicUrl, error: null };
    } catch (err) {
      console.error('❌ [Storage] uploadRequestChannelIcon exception:', err);
      return { url: null, error: err };
    }
  },

  /** Imagem de comunicado — bucket público `GeComunicado` (Supabase Storage). */
  async uploadComunicadoImage(file: File, userId?: string): Promise<{ url: string | null; error: unknown }> {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 80);
      const fileName = `${Date.now()}-${safeName}`;
      const prefix = userId ? `${userId}/` : 'uploads/';
      const filePath = `${prefix}${fileName}`;

      const { error } = await supabase.storage.from('GeComunicado').upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

      if (error) {
        console.error('❌ [Storage] Comunicado image upload error:', error);
        return { url: null, error };
      }

      const { data: publicUrlData } = supabase.storage.from('GeComunicado').getPublicUrl(filePath);
      return { url: publicUrlData.publicUrl, error: null };
    } catch (err) {
      console.error('❌ [Storage] uploadComunicadoImage exception:', err);
      return { url: null, error: err };
    }
  },
};

// Auth Service
export const authService = {
  async signIn(email: string, password: string) {
    try {
      console.log('🔵 [AuthService] signIn chamado para:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      console.log('🔵 [AuthService] signIn resultado:', { 
        user: data?.user?.id, 
        session: !!data?.session,
        error: error?.message 
      });
      
      return { data, error };
    } catch (error) {
      console.error('❌ [AuthService] signIn exception:', error);
      return { data: null, error };
    }
  },

  async signUp(email: string, password: string, fullName: string, role: 'admin' | 'creator' | 'user' = 'user') {
    try {
      console.log('🔵 [SignUp] Iniciando cadastro:', { email, fullName, role });
      
      // Validar domínio
      const allowedDomain = '@genesisempreendimentos.com.br';
      if (!email.endsWith(allowedDomain)) {
        console.log('❌ [SignUp] Domínio inválido:', email);
        return { 
          data: null, 
          error: { message: 'Apenas emails do domínio @genesisempreendimentos.com.br são permitidos' } 
        };
      }

      console.log('🔵 [SignUp] Chamando Supabase Auth signUp...');
      
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: fullName,
          },
          emailRedirectTo: window.location.origin + '/login'
        }
      });

      console.log('🔵 [SignUp] Resposta do Auth:', { authData, authError });

      if (authError) {
        console.error('❌ [SignUp] Erro no Auth:', authError);
        
        // Tratamento específico para rate limit
        if (authError.message?.includes('rate limit')) {
          return { 
            data: null, 
            error: { 
              message: 'Limite de tentativas excedido. Por favor, aguarde alguns minutos antes de tentar novamente.' 
            } 
          };
        }
        
        return { data: null, error: authError };
      }

      if (!authData.user) {
        console.error('❌ [SignUp] User não retornou do Auth');
        return { data: null, error: { message: 'Erro ao criar usuário no sistema de autenticação' } };
      }

      console.log('✅ [SignUp] Usuário criado no Auth:', authData.user.id);
      console.log('🔵 [SignUp] Criando registro na tabela profiles...');

      const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`;
      const userId = authData.user.id;

      // Tenta com coluna "id" (padrão); se a tabela usar "user_id" como PK, tenta com user_id
      const payloadWithId = { id: userId, full_name: fullName, avatar_url: avatarUrl, access_type: role, email };
      const payloadWithUserId = { user_id: userId, full_name: fullName, avatar_url: avatarUrl, access_type: role, email };

      let profileError: Error | null = null;
      let lastError: { message?: string; code?: string } | null = null;

      for (const payload of [payloadWithId, payloadWithUserId]) {
        const { error: dbError } = await supabase
          .from('profiles')
          .insert([payload]);

        if (!dbError) {
          console.log('✅ [SignUp] Registro criado na tabela profiles');
          return { data: authData, error: null };
        }
        lastError = dbError;
        if (dbError?.code === 'PGRST204' || (dbError?.message && dbError.message.includes("Could not find the 'id' column"))) {
          continue;
        }
        profileError = dbError;
        break;
      }

      if (profileError || lastError) {
        const err = profileError || lastError;
        console.error('❌ [SignUp] Erro ao criar registro na tabela profiles:', err);
        return {
          data: authData,
          error: {
            message: `Usuário criado no Auth mas falhou ao salvar dados: ${err?.message ?? 'Coluna id ou user_id não encontrada em profiles. Verifique o nome da PK na tabela.'}`,
          },
        };
      }
      console.log('✅ [SignUp] Cadastro completo!');

      return { data: authData, error: null };
    } catch (error) {
      console.error('❌ [SignUp] Erro geral:', error);
      return { data: null, error };
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
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
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) return { data: null, error };

      let profileRow: ProfileRow | null = null;
      let dbError: Error | null = null;
      // profiles usa user_id (coluna id pode não existir no projeto)
      for (const key of ['user_id']) {
        const { data, error: e } = await supabase
          .from('profiles')
          .select('*')
          .eq(key, user.id)
          .maybeSingle();
        if (!e && data) {
          profileRow = data as ProfileRow;
          break;
        }
        dbError = e;
      }
      if (profileRow) {
        const userData = profileToUser(profileRow, user.email);
        return { data: userData, error: null };
      }
      return { data: null, error: dbError };
    } catch (error) {
      console.error('❌ [AuthService] getCurrentUser exception:', error);
      return { data: null, error };
    }
  },
};

export const databaseService = {
  /** Persiste `profiles.thema` (white | dark | fulldark) para o utilizador autenticado. */
  async updateProfileThema(userId: string, thema: ProfileThema) {
    const { error } = await supabase.from('profiles').update({ thema }).eq('user_id', userId);
    return { error };
  },

  async updateProfileSidebar(userId: string, sidebar: SidebarMode) {
    const { error } = await supabase.from('profiles').update({ sidebar }).eq('user_id', userId);
    return { error };
  },

  // Profiles (tabela profiles no Supabase)
  async getUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return { data: null, error };
    const mapped = (data ?? []).map((row) => profileToUser(row as ProfileRow));
    return { data: mapped, error: null };
  },

  async getAdministrators() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('access_type', 'admin')
      .order('created_at', { ascending: false });
    if (error) return { data: null, error };
    const mapped = (data ?? []).map((row) => profileToUser(row as ProfileRow));
    return { data: mapped, error: null };
  },

  /** Usuários com access_type === 'admin' na tabela profiles (acesso ao painel admin). */
  async getAppsAdmins() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('access_type', 'admin')
      .order('created_at', { ascending: false });
    if (error) return { data: null, error };
    const mapped = (data ?? []).map((row) => profileToUser(row as ProfileRow));
    return { data: mapped, error: null };
  },

  /** Busca colaboradores (profiles) por nome ou e-mail para o modal Liberar acesso. */
  async searchProfiles(query: string): Promise<{ data: { id: string; name: string; email: string; avatar?: string }[]; error: any }> {
    const q = (query ?? '').trim();
    if (!q || q.length < 2) return { data: [], error: null };
    const term = `%${q}%`;
    const seen = new Set<string>();
    const list: { id: string; name: string; email: string; avatar?: string }[] = [];
    const push = (row: any) => {
      const id = (row.user_id ?? row.id ?? '').toString();
      if (!id || seen.has(id)) return;
      seen.add(id);
      list.push({
        id,
        name: (row.full_name ?? row.name ?? '').toString(),
        email: (row.email ?? '').toString(),
        avatar: row.avatar_url ?? row.avatar,
      });
    };
    const select = 'user_id, full_name, name, email, avatar_url, avatar';
    const { data: byEmail, error: errEmail } = await supabase
      .from('profiles')
      .select(select)
      .ilike('email', term);
    if (!errEmail && Array.isArray(byEmail)) byEmail.forEach(push);
    const { data: byName, error: errName } = await supabase
      .from('profiles')
      .select(select)
      .ilike('full_name', term);
    if (!errName && Array.isArray(byName)) byName.forEach(push);
    const { data: byNameAlt, error: errNameAlt } = await supabase
      .from('profiles')
      .select(select)
      .ilike('name', term);
    if (!errNameAlt && Array.isArray(byNameAlt)) byNameAlt.forEach(push);
    const error = errEmail ?? errName ?? errNameAlt;
    if (error) return { data: [], error };
    return { data: list, error: null };
  },

  async getAdminCounts(): Promise<{
    users: number;
    softadmins: number;
    apps: number;
    activeApps: number;
  }> {
    try {
      const [usersRes, adminsRes, appsRes, activeAppsRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).ilike('access_type', 'admin'),
        supabase.from('apps').select('*', { count: 'exact', head: true }),
        supabase.from('apps').select('*', { count: 'exact', head: true }).in('status', ['ativo', 'active', 'beta']),
      ]);
      return {
        users: usersRes.count ?? 0,
        softadmins: adminsRes.count ?? 0,
        apps: appsRes.count ?? 0,
        activeApps: activeAppsRes.count ?? 0,
      };
    } catch {
      return { users: 0, softadmins: 0, apps: 0, activeApps: 0 };
    }
  },

  async getTotalAccessCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });
      if (error) return 0;
      return count ?? 0;
    } catch {
      return 0;
    }
  },

  async getAccessLogsAll(limit = 500) {
    return this.getAccessLogs(undefined, limit);
  },

  async getUserById(userId: string) {
    for (const key of ['user_id']) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq(key, userId)
        .maybeSingle();
      if (!error && data) {
        const row = data as ProfileRow & Record<string, unknown>;
        const base = profileToUser(data as ProfileRow);
        if (!base) return { data: null, error: { message: 'Profile not found' } };
        return {
          data: {
            ...base,
            avatar: row.avatar_url ?? row.avatar,
            apelido: row.apelido,
            username: row.username,
            bio: row.bio,
            icon: row.icon,
            linkedin: row.linkedin,
            instagram: row.instagram,
            whatsapp: row.whatsapp,
            phone: row.phone,
            location: row.location,
            job_title: row.job_title,
            birth_date: row.birth_date,
            banner_url: (row as any).banner_url ?? null,
            mascote: (row as any).mascote ?? null,
          },
          error: null,
        };
      }
    }
    return { data: null, error: { message: 'Profile not found' } };
  },

  async getUserByEmail(email: string) {
    console.log('🔍 [getUserByEmail] Verificando email:', email);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    console.log('🔍 [getUserByEmail] Resultado:', { data, error, exists: !!data });
    if (error) return { data: null, error };
    return { data: data ? profileToUser(data as ProfileRow) : null, error: null };
  },

  /** Verifica se o email existe em profiles (usa RPC profiles_email_exists se existir, senão getUserByEmail). */
  async profilesEmailExists(email: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('profiles_email_exists', { check_email: email });
    if (!error && typeof data === 'boolean') return data;
    const { data: user } = await this.getUserByEmail(email);
    return !!user;
  },

  async createUser(userData: any) {
    const payload = userToProfilePayload({
      name: userData.name,
      email: userData.email,
      role: userData.role ?? 'user',
      avatar: userData.avatar,
    });
    const { data, error } = await supabase
      .from('profiles')
      .insert([{ user_id: userData.id, ...payload }])
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: profileToUser(data as ProfileRow), error: null };
  },

  async updateUser(userId: string, userData: any) {
    const payload: Record<string, unknown> = {};
    if (userData.name != null) payload.full_name = userData.name;
    if (userData.avatar != null) payload.avatar_url = userData.avatar;
    if (userData.accessType != null) payload.access_type = userData.accessType;
    if (userData.role != null) payload.access_type = userData.role;
    if (userData.email != null) payload.email = userData.email;
    if (userData.apelido != null) payload.apelido = userData.apelido;
    if (userData.username != null) payload.username = userData.username;
    if (userData.bio != null) payload.bio = userData.bio;
    if (userData.icon != null) payload.icon = userData.icon;
    if (userData.linkedin != null) payload.linkedin = userData.linkedin;
    if (userData.instagram != null) payload.instagram = userData.instagram;
    if (userData.whatsapp != null) payload.whatsapp = userData.whatsapp;
    if (userData.phone != null) payload.phone = userData.phone;
    if (userData.location != null) payload.location = userData.location;
    if (userData.banner_url != null) payload.banner_url = userData.banner_url;
    if (userData.mascote != null) payload.mascote = userData.mascote;
    if (userData.access_type != null) payload.access_type = userData.access_type;
    if (userData.profileStatus != null) {
      const ps = String(userData.profileStatus).toLowerCase();
      if (ps === 'archived' || ps === 'arquivado') payload.profile_status = 'archived';
      else if (ps === 'deleted' || ps === 'excluido' || ps === 'excluído') payload.profile_status = 'deleted';
      else payload.profile_status = 'active';
    }
    for (const key of ['user_id']) {
      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq(key, userId)
        .select()
        .maybeSingle();
      if (!error && data) return { data: profileToUser(data as ProfileRow), error: null };
    }
    return { data: null, error: { message: 'Profile not found' } };
  },

  async deleteUser(userId: string) {
    console.log('🗑️ [deleteUser] Deletando usuário:', userId);
    for (const key of ['user_id']) {
      const { data, error } = await supabase
        .from('profiles')
        .delete()
        .eq(key, userId)
        .select();
      if (error) {
        console.error('❌ [deleteUser] Erro ao deletar da tabela profiles:', error);
        continue;
      }
      if (data && data.length > 0) {
        console.log('✅ [deleteUser] Usuário deletado da tabela profiles');
        return { error: null };
      }
    }
    console.warn('⚠️ [deleteUser] Nenhuma linha foi deletada! Pode ser problema de RLS policy');
    return { error: { message: 'Nenhum registro foi deletado. Verifique as permissões RLS no Supabase.' } };
  },

  // Status válidos para apps: ativo, beta, rascunho, arquivado, excluído (legado: active/inactive)
  appRowToSystem(row: any): any {
    const rawStatus = (row.status ?? row.active ?? '').toString().toLowerCase();
    const statusMap: Record<string, string> = {
      active: 'ativo',
      inactive: 'arquivado',
      ativo: 'ativo',
      beta: 'beta',
      rascunho: 'rascunho',
      arquivado: 'arquivado',
      excluído: 'excluído',
      excluido: 'excluído',
    };
    const status = statusMap[rawStatus] ?? (rawStatus || 'rascunho');
    const active = status === 'ativo' || status === 'beta';
    return {
      id: row.id,
      name: row.name ?? row.title ?? '',
      description: row.description ?? '',
      url: row.url ?? '',
      icon: getSystemIcon(row),
      category: row.category ?? 'Ferramentas',
      status,
      active,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      next_release_version: row.next_release_version ?? '',
      next_release_date: row.next_release_date ?? '',
    };
  },

  async getSystems() {
    const { data, error } = await supabase
      .from('apps')
      .select('*');
    if (error) {
      console.error('[getSystems] Erro ao ler tabela apps:', error);
      return { data: null, error };
    }
    const rows = Array.isArray(data) ? data : [];
    const mapped = rows.map((r: any) => this.appRowToSystem(r));
    mapped.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
    return { data: mapped, error: null };
  },

  async getSystemById(systemId: string) {
    const { data, error } = await supabase
      .from('apps')
      .select('*')
      .eq('id', systemId)
      .single();
    if (error) return { data: null, error };
    return { data: data ? this.appRowToSystem(data) : null, error: null };
  },

  /** Busca app por slug (ex.: geteams, geforms). Usado por apps irmãos para validar acesso. */
  async getAppBySlug(slug: string) {
    const normalized = (slug || '').toLowerCase().trim().replace(/\s+/g, '');
    if (!normalized) return { data: null, error: null };
    const { data, error } = await supabase
      .from('apps')
      .select('*')
      .ilike('slug', normalized)
      .maybeSingle();
    if (error) return { data: null, error };
    return { data: data ? this.appRowToSystem(data) : null, error: null };
  },

  /** Verifica se o usuário tem acesso ao app (user_app_access.access = true e app ativo/beta). */
  async userHasAccessToApp(userId: string, appId: string) {
    const { data: app, error: appError } = await supabase
      .from('apps')
      .select('id, status')
      .eq('id', appId)
      .single();
    if (appError || !app) return { data: false, error: appError };
    const status = (app.status ?? '').toString().toLowerCase();
    if (status !== 'ativo' && status !== 'beta') return { data: false, error: null };
    const { data: accessRow, error: accessError } = await supabase
      .from('user_app_access')
      .select('access')
      .eq('user_id', userId)
      .eq('app_id', appId)
      .maybeSingle();
    if (accessError) return { data: false, error: accessError };
    const hasAccess = accessRow?.access === true;
    return { data: hasAccess, error: null };
  },

  /** Verifica se o usuário tem acesso ao app identificado pelo slug (ex.: geteams). */
  async userHasAccessToAppBySlug(userId: string, slug: string) {
    const { data: app, error: appErr } = await this.getAppBySlug(slug);
    if (appErr || !app) return { data: false, error: appErr };
    return this.userHasAccessToApp(userId, app.id);
  },

  /**
   * Apps visíveis para um membro: user_app_access.access = true para o user_id,
   * e app com status ativo/beta. Só esses aparecem em "aplicativos disponíveis".
   */
  async getSystemsForMember(userId: string) {
    const { data: accessRows, error: accessError } = await supabase
      .from('user_app_access')
      .select('app_id, access')
      .eq('user_id', userId);
    if (accessError) return { data: [], error: accessError };
    const rows = Array.isArray(accessRows) ? accessRows : [];
    const withAccess = rows.filter((r: any) => r.access === true);
    const appIds = withAccess.map((r: any) => r.app_id).filter(Boolean);
    if (appIds.length === 0) return { data: [], error: null };
    const { data: appRows, error: appsError } = await supabase
      .from('apps')
      .select('*')
      .in('id', appIds)
      .in('status', ['ativo', 'beta', 'active']);
    if (appsError) return { data: [], error: appsError };
    const appList = Array.isArray(appRows) ? appRows : [];
    const mapped = appList.map((r: any) => this.appRowToSystem(r));
    mapped.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
    return { data: mapped, error: null };
  },

  async createSystem(systemData: any) {
    const slug =
      systemData.slug ??
      (systemData.name ? normalizeSlug(systemData.name) : '');
    const statusVal = (systemData.status ?? 'rascunho').toString().toLowerCase();
    const validStatus = ['ativo', 'beta', 'rascunho', 'arquivado', 'excluído'].includes(statusVal)
      ? statusVal
      : 'rascunho';
    const row: any = {
      name: systemData.name,
      url: systemData.url ?? '',
      description: systemData.description ?? '',
      status: validStatus,
      slug,
      next_release_version: systemData.next_release_version || null,
      next_release_date: systemData.next_release_date || null,
    };
    if (systemData.category != null) row.category = systemData.category;
    const icon = systemData.icon ?? systemData.icon_url ?? systemData.logo;
    if (icon && (String(icon).startsWith('/') || String(icon).startsWith('http') || /\.(svg|png|jpg|jpeg)$/i.test(String(icon)))) {
      row.icon_url = icon;
    }
    const { data, error } = await supabase.from('apps').insert([row]).select().single();
    if (error) return { data: null, error };
    return { data: data ? this.appRowToSystem(data) : null, error: null };
  },

  async updateSystem(systemId: string, systemData: any) {
    const row: any = {};
    if (systemData.name != null) row.name = systemData.name;
    if (systemData.url != null) row.url = systemData.url;
    if (systemData.description != null) row.description = systemData.description;
    if (systemData.icon != null || systemData.icon_url != null || systemData.logo != null)
      row.icon_url = systemData.icon ?? systemData.icon_url ?? systemData.logo;
    if (systemData.status != null) {
      const s = (systemData.status ?? '').toString().toLowerCase();
      if (['ativo', 'beta', 'rascunho', 'arquivado', 'excluído'].includes(s)) row.status = s;
    }
    if (systemData.active != null) row.status = systemData.active ? 'ativo' : 'arquivado';
    if (systemData.category != null) row.category = systemData.category;
    if (systemData.next_release_version !== undefined) row.next_release_version = systemData.next_release_version || null;
    if (systemData.next_release_date !== undefined) row.next_release_date = systemData.next_release_date || null;
    if (Object.keys(row).length === 0) {
      const { data } = await supabase.from('apps').select('*').eq('id', systemId).single();
      return { data: data ? this.appRowToSystem(data) : null, error: null };
    }
    const { data, error } = await supabase.from('apps').update(row).eq('id', systemId).select().single();
    if (error) return { data: null, error };
    return { data: data ? this.appRowToSystem(data) : null, error: null };
  },

  async deleteSystem(systemId: string) {
    const { error } = await supabase
      .from('apps')
      .delete()
      .eq('id', systemId);
    return { error };
  },

  // User App Access (tabela user_app_access: access, is_favorite, access_type 'member'|'viewer')
  async getUserSystemAccess(userId: string) {
    const { data, error } = await supabase
      .from('user_app_access')
      .select('*')
      .eq('user_id', userId);
    if (error) return { data: null, error };
    // Mapear para o frontend: app_id -> system_id, access -> can_access, is_favorite
    const mapped = (data ?? []).map((row: any) => ({
      ...row,
      system_id: row.app_id ?? row.system_id,
      can_access: row.access ?? row.can_access ?? true,
      is_favorite: row.is_favorite ?? row.favorite ?? false,
    }));
    return { data: mapped, error: null };
  },

  /** Usuários com acesso a um app (para exibir no AvatarStack). */
  async getUsersWithAccessToApp(appId: string): Promise<{ data: { id: string; name: string; avatar?: string }[]; error: any }> {
    const { data: accessRows, error: accessError } = await supabase
      .from('user_app_access')
      .select('user_id')
      .eq('app_id', appId)
      .eq('access', true);
    if (accessError || !accessRows?.length) return { data: [], error: accessError };
    const userIds = [...new Set(accessRows.map((r: any) => r.user_id).filter(Boolean))];
    if (userIds.length === 0) return { data: [], error: null };
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, name, avatar_url, avatar, email')
      .in('user_id', userIds);
    const rows = Array.isArray(profiles) ? profiles : [];
    const list = rows.map((row: any) => ({
      id: row.user_id ?? row.id ?? '',
      name: (row.full_name ?? row.name ?? row.email ?? '').toString(),
      avatar: row.avatar_url ?? row.avatar,
    })).filter((u) => u.id);
    return { data: list, error: null };
  },

  async setUserSystemAccess(userId: string, systemId: string, canAccess: boolean) {
    const { data, error } = await supabase
      .from('user_app_access')
      .upsert(
        { user_id: userId, app_id: systemId, access: canAccess, access_type: 'member' },
        { onConflict: 'user_id,app_id' }
      )
      .select()
      .single();
    return { data, error };
  },

  /** Conta favoritos ativos: access true e is_favorite true (alinha à UI de favoritos). */
  async countActiveFavoriteApps(userId: string): Promise<{ count: number; error: unknown }> {
    const { count, error } = await supabase
      .from('user_app_access')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('access', true)
      .eq('is_favorite', true);
    return { count: count ?? 0, error };
  },

  async toggleFavorite(userId: string, systemId: string) {
    const { data: current } = await supabase
      .from('user_app_access')
      .select('*')
      .eq('user_id', userId)
      .eq('app_id', systemId)
      .maybeSingle();

    const isFav = current ? !!(current.is_favorite ?? (current as any).favorite) : false;

    // Só ao ativar favorito: validar limite antes de gravar
    if (!isFav) {
      const { count, error: countErr } = await this.countActiveFavoriteApps(userId);
      if (countErr) {
        console.warn('[toggleFavorite] countActiveFavoriteApps:', countErr);
      }
      if (count >= MAX_FAVORITE_APPS_PER_USER) {
        return {
          data: null,
          error: {
            code: FAVORITE_LIMIT_ERROR_CODE,
            message: `É permitido no máximo ${MAX_FAVORITE_APPS_PER_USER} aplicativos favoritos.`,
          },
        };
      }
    }

    if (current) {
      const { data, error } = await supabase
        .from('user_app_access')
        .update({ is_favorite: !isFav, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('app_id', systemId)
        .select()
        .single();
      return { data, error };
    }

    // Inserir novo registro: favoritar = acesso + is_favorite (qualquer um pode salvar)
    const { data, error } = await supabase
      .from('user_app_access')
      .upsert(
        {
          user_id: userId,
          app_id: systemId,
          access: true,
          access_type: 'member',
          is_favorite: true,
        },
        { onConflict: 'user_id,app_id' }
      )
      .select()
      .single();
    return { data, error };
  },

  // Audit Logs (tabela audit_logs: actor_user_id, app_id, action, entity_type, ...)
  async logAccess(userId: string, systemId: string) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert([{ actor_user_id: userId, app_id: systemId, action: 'access', entity_type: 'app', entity_id: systemId }])
        .select()
        .single();
      if (error) console.warn('Falha ao registrar log de acesso:', error);
      return { data, error };
    } catch (err) {
      console.warn('Erro ao registrar log de acesso:', err);
      return { data: null, error: err };
    }
  },

  async getAccessLogs(userId?: string, limit = 50) {
    // audit_logs usa actor_user_id (não user_id); ordenação por timestamp ou created_at
    const orderCols = ['created_at', 'timestamp'] as const;
    let rows: Array<{ actor_user_id?: string; app_id?: string; [k: string]: unknown }> | null = null;
    let error: unknown = null;
    for (const orderCol of orderCols) {
      let query = supabase.from('audit_logs').select('*').order(orderCol, { ascending: false }).limit(limit);
      if (userId) query = query.eq('actor_user_id', userId);
      const result = await query;
      if (!result.error) {
        rows = (result.data ?? []) as Array<{ actor_user_id?: string; app_id?: string; [k: string]: unknown }>;
        error = null;
        break;
      }
      error = result.error;
    }
    if (error && !rows) return { data: null, error };
    const list = (rows ?? []) as Array<{ actor_user_id?: string; app_id?: string; [k: string]: unknown }>;
    const userIds = [...new Set(list.map((r) => r.actor_user_id).filter(Boolean))] as string[];
    const appIds = [...new Set(list.map((r) => r.app_id).filter(Boolean))] as string[];
    const [profilesByUserIdRes, appsRes] = await Promise.all([
      userIds.length ? supabase.from('profiles').select('*').in('user_id', userIds) : { data: [] as ProfileRow[] },
      appIds.length ? supabase.from('apps').select('*').in('id', appIds) : { data: [] as Record<string, unknown>[] },
    ]);
    const profilesByIdRes = { data: [] as ProfileRow[] };
    const profileByUserId = new Map<string, ProfileRow>();
    for (const p of [...(profilesByIdRes.data ?? []), ...(profilesByUserIdRes.data ?? [])]) {
      const row = p as ProfileRow;
      if (row.id) profileByUserId.set(row.id, row);
      if (row.user_id) profileByUserId.set(row.user_id, row);
    }
    const appById = new Map<string, Record<string, unknown>>();
    for (const a of appsRes.data ?? []) {
      const id = (a as { id?: string }).id;
      if (id) appById.set(id, a as Record<string, unknown>);
    }
    const normalized = list.map((row: Record<string, unknown>) => {
      const actorId = (row.actor_user_id ?? row.user_id) as string | undefined;
      const user = actorId ? profileToUser(profileByUserId.get(actorId) ?? null) : null;
      const app = row.app_id ? appById.get(row.app_id as string) : null;
      return {
        ...row,
        user_id: actorId ?? row.user_id,
        system_id: row.app_id ?? row.system_id,
        systemId: row.app_id ?? row.system_id,
        userName: user?.name ?? row.userName,
        systemName: (app as { name?: string })?.name ?? row.systemName,
        users: user,
        systems: app,
      };
    });
    return { data: normalized, error: null };
  },

  // Categories (tabela categories)
  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    return { data: (data || []) as CategoryRow[], error };
  },

  async createCategory(categoryData: Partial<CategoryRow>) {
    const { data, error } = await supabase
      .from('categories')
      .insert([categoryData])
      .select()
      .single();
    return { data: data as CategoryRow, error };
  },

  async updateCategory(id: string, categoryData: Partial<CategoryRow>) {
    const { data, error } = await supabase
      .from('categories')
      .update(categoryData)
      .eq('id', id)
      .select()
      .single();
    return { data: data as CategoryRow, error };
  },

  async deleteCategory(id: string) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    return { error };
  },

  /** Comunicados (`statement`). Lista vazia se a tabela não existir ou houver erro. */
  async listStatements(): Promise<{ data: Statement[]; error: null }> {
    try {
      const { data, error } = await supabase
        .from(STATEMENT_TABLE)
        .select('*')
        .order('published_at', { ascending: false });
      if (error) {
        console.warn('[statement] list:', error.message ?? error);
        return { data: [], error: null };
      }
      const list = (data ?? []) as StatementRow[];
      const mapped = list.map((row) => statementRowToApp(row));

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id || !mapped.length) return { data: mapped, error: null };

      const statementIds = mapped.map((s) => s.id);
      const { data: reactions, error: reactionsErr } = await supabase
        .from(STATEMENT_REACTION_TABLE)
        .select('statement_id, viewed, deleted_at, is_active')
        .eq('user_id', user.id)
        .in('statement_id', statementIds);
      if (reactionsErr) {
        console.warn('[statement_reaction] list user viewed:', reactionsErr.message ?? reactionsErr);
        return { data: mapped, error: null };
      }

      const viewedByStatementId = new Map<string, boolean>();
      for (const raw of ((reactions ?? []) as Array<Pick<StatementReactionRow, 'statement_id' | 'viewed' | 'deleted_at' | 'is_active'>>)) {
        if (raw.deleted_at || raw.is_active === false) continue;
        viewedByStatementId.set(raw.statement_id, raw.viewed === true);
      }

      return {
        data: mapped.map((s) => ({
          ...s,
          viewed: viewedByStatementId.get(s.id) === true,
        })),
        error: null,
      };
    } catch (e) {
      console.warn('[statement] list exception:', e);
      return { data: [], error: null };
    }
  },

  /** Regista que o utilizador atual abriu o comunicado (idempotente). */
  async markStatementViewed(statementId: string): Promise<{ error: unknown | null }> {
    return this.upsertStatementReaction(statementId, { viewed: true });
  },

  /** Há algum comunicado que o utilizador atual ainda não abriu? */
  async hasUnviewedStatementsForCurrentUser(): Promise<boolean> {
    const { data } = await this.listStatements();
    return (data ?? []).some((s) => !s.viewed);
  },

  /** Lista interações de comunicado, opcionalmente filtrando por ids de statement. */
  async listStatementReactions(statementIds?: string[]): Promise<{ data: StatementReaction[]; error: unknown | null }> {
    try {
      let query = supabase
        .from(STATEMENT_REACTION_TABLE)
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      const ids = (statementIds ?? []).map((id) => String(id).trim()).filter(Boolean);
      if (ids.length) query = query.in('statement_id', ids);
      const { data, error } = await query;
      if (error) return { data: [], error };
      const rows = (data ?? []) as StatementReactionRow[];
      return { data: rows.map(statementReactionRowToApp), error: null };
    } catch (e) {
      return { data: [], error: e };
    }
  },

  /** Lista reações de um statement com dados básicos do profile para renderização em modal. */
  async listStatementReactionsWithUsers(statementId: string): Promise<{ data: StatementReactionWithUser[]; error: unknown | null }> {
    const { data: reactions, error } = await this.listStatementReactions([statementId]);
    if (error) return { data: [], error };
    if (!reactions.length) return { data: [], error: null };

    const userIds = [...new Set(reactions.map((r) => r.userId).filter(Boolean))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, email, avatar_url, avatar')
      .in('user_id', userIds);
    const profileByUserId = new Map<string, { email?: string | null; avatar_url?: string | null; avatar?: string | null }>();
    for (const row of (profiles ?? []) as Array<{ user_id?: string; email?: string | null; avatar_url?: string | null; avatar?: string | null }>) {
      if (!row.user_id) continue;
      profileByUserId.set(row.user_id, row);
    }

    return {
      data: reactions.map((r) => {
        const profile = profileByUserId.get(r.userId);
        return {
          ...r,
          userEmail: profile?.email ?? undefined,
          userAvatar: profile?.avatar_url ?? profile?.avatar ?? undefined,
        };
      }),
      error: null,
    };
  },

  /** Lista comentários de um comunicado com dados do usuário. */
  async listStatementComments(statementId: string): Promise<{ data: StatementCommentWithUser[]; error: unknown | null }> {
    try {
      const { data: rows, error } = await supabase
        .from('statement_comment')
        .select('*')
        .eq('statement_id', statementId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) {
        // Se a tabela não existir, retorna array vazio sem quebrar
        if (error.code === '42P01') return { data: [], error: null };
        return { data: [], error };
      }

      if (!rows || rows.length === 0) return { data: [], error: null };

      const comments = rows.map(statementCommentRowToApp);
      const userIds = [...new Set(comments.map((c) => c.userId))];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, full_name, email, avatar_url, avatar')
        .in('user_id', userIds);

      const profileByUserId = new Map<string, any>();
      for (const row of (profiles ?? [])) {
        if (!row.user_id) continue;
        profileByUserId.set(row.user_id, row);
      }

      const enriched = comments.map((c) => {
        const p = profileByUserId.get(c.userId);
        return {
          ...c,
          userName: p?.name || p?.full_name || 'Usuário',
          userEmail: p?.email,
          userAvatar: p?.avatar || p?.avatar_url,
        };
      });

      return { data: enriched, error: null };
    } catch (e) {
      console.warn('[statement_comment] list exception:', e);
      return { data: [], error: e };
    }
  },

  /** Adiciona um comentário a um comunicado. */
  async addStatementComment(statementId: string, content: string): Promise<{ data: StatementComment | null; error: unknown | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: new Error('Não autenticado') };

      const { data, error } = await supabase
        .from('statement_comment')
        .insert({
          statement_id: statementId,
          user_id: user.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) return { data: null, error };
      return { data: data ? statementCommentRowToApp(data) : null, error: null };
    } catch (e) {
      console.warn('[statement_comment] add exception:', e);
      return { data: null, error: e };
    }
  },

  /** Deleta (soft delete) um comentário. */
  async deleteStatementComment(commentId: string): Promise<{ error: unknown | null }> {
    try {
      const { error } = await supabase
        .from('statement_comment')
        .delete()
        .eq('id', commentId);
      return { error };
    } catch (e) {
      console.warn('[statement_comment] delete exception:', e);
      return { error: e };
    }
  },

  /**
   * Cria/atualiza interação do utilizador autenticado com o comunicado.
   * Usa upsert com constraint única (statement_id, user_id).
   */
  async upsertStatementReaction(
    statementId: string,
    payload: { viewed?: boolean; reaction?: string | null }
  ): Promise<{ error: unknown | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return { error: new Error('Sem sessão') };

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, name')
        .eq('user_id', user.id)
        .maybeSingle();
      const userName =
        String((profile as { full_name?: string; name?: string } | null)?.full_name ?? '').trim() ||
        String((profile as { full_name?: string; name?: string } | null)?.name ?? '').trim() ||
        'Usuário';

      const reaction = payload.reaction == null ? null : String(payload.reaction).trim() || null;
      const viewed = payload.viewed === true;
      const insertPayload: Record<string, unknown> = {
        statement_id: statementId,
        user_id: user.id,
        user_name: userName,
        is_active: true,
        deleted_at: null,
      };
      if (payload.viewed !== undefined) insertPayload.viewed = viewed;
      if (payload.reaction !== undefined) insertPayload.reaction = reaction;
      if (reaction != null) insertPayload.viewed = true;

      const { error } = await supabase
        .from(STATEMENT_REACTION_TABLE)
        .upsert(insertPayload, { onConflict: 'statement_id,user_id' });
      if (error) return { error };
      return { error: null };
    } catch (e) {
      return { error: e };
    }
  },

  async createStatement(payload: {
    title: string;
    image_url: string;
    caption?: string | null;
    tags: string[];
    user_id: string;
  }): Promise<{ data: Statement | null; error: unknown }> {
    try {
      const { data, error } = await supabase
        .from(STATEMENT_TABLE)
        .insert([
          {
            title: payload.title.trim(),
            image_url: payload.image_url.trim(),
            caption: payload.caption?.trim() || null,
            tags: payload.tags.length ? payload.tags : [],
            user_id: payload.user_id,
          },
        ])
        .select()
        .single();
      if (error) return { data: null, error };
      return { data: statementRowToApp(data as StatementRow), error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  },

  /** Canais de solicitação (tabela `request_channels`). Lista vazia se a tabela ainda não existir ou houver erro. */
  async listRequestChannels(): Promise<{ data: RequestChannel[]; error: null }> {
    try {
      const { data, error } = await supabase
        .from(REQUEST_CHANNELS_TABLE)
        .select('*')
        .order('name', { ascending: true });
      if (error) {
        console.warn('[request_channels] list:', error.message ?? error);
        return { data: [], error: null };
      }
      const list = (data ?? []) as RequestChannelRow[];
      return { data: list.map(requestChannelRowToApp), error: null };
    } catch (e) {
      console.warn('[request_channels] list exception:', e);
      return { data: [], error: null };
    }
  },

  async createRequestChannel(payload: {
    name: string;
    icon_url?: string | null;
    url?: string | null;
    channel_type: RequestChannelType;
    description?: string | null;
    color?: string | null;
  }): Promise<{ data: RequestChannel | null; error: unknown }> {
    try {
      const { data, error } = await supabase
        .from(REQUEST_CHANNELS_TABLE)
        .insert([
          {
            name: payload.name.trim(),
            icon_url: payload.icon_url?.trim() || null,
            url: payload.url?.trim() || null,
            channel_type: payload.channel_type,
            description: payload.description?.trim() || null,
            color: payload.color?.trim() || null,
          },
        ])
        .select()
        .single();
      if (error) return { data: null, error };
      return { data: requestChannelRowToApp(data as RequestChannelRow), error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  },

  /** Equipes cadastradas no Supabase. */
  async listTeams(options?: { activeOnly?: boolean }): Promise<{ data: Team[]; error: null }> {
    const activeOnly = options?.activeOnly === true;
    try {
      let q = supabase.from(TEAMS_TABLE).select('*').order('name', { ascending: true });
      if (activeOnly) {
        q = q.eq('status', 'active');
      }
      const { data, error } = await q;
      if (error) {
        console.warn('[teams] list:', error.message ?? error);
        return { data: [], error: null };
      }
      const list = (data ?? []) as TeamRow[];
      return { data: list.map(teamRowToApp), error: null };
    } catch (e) {
      console.warn('[teams] list exception:', e);
      return { data: [], error: null };
    }
  },

  async createTeam(payload: {
    name: string;
    neon_department_id: string;
    status?: TeamLifecycleStatus;
  }): Promise<{ data: Team | null; error: unknown }> {
    try {
      const status: TeamLifecycleStatus = payload.status ?? 'active';
      const { data, error } = await supabase
        .from(TEAMS_TABLE)
        .insert([
          {
            name: payload.name.trim(),
            neon_department_id: payload.neon_department_id.trim(),
            status,
          },
        ])
        .select()
        .single();
      if (error) return { data: null, error };
      return { data: teamRowToApp(data as TeamRow), error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  },

  async updateTeamStatus(
    teamId: string,
    status: TeamLifecycleStatus,
  ): Promise<{ data: Team | null; error: unknown }> {
    try {
      const { data, error } = await supabase
        .from(TEAMS_TABLE)
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', teamId)
        .select()
        .single();
      if (error) return { data: null, error };
      return { data: teamRowToApp(data as TeamRow), error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  },
};

// Chat Service
export const chatService = {
  async getConversations(userId: string) {
    const { data: participantRows, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);
    if (partError || !participantRows?.length) return { data: [], error: partError };

    const convIds = participantRows.map((p) => p.conversation_id);
    const { data: convs, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .in('id', convIds)
      .order('updated_at', { ascending: false });
    if (convError) return { data: [], error: convError };

    const withParticipants = await Promise.all(
      (convs || []).map(async (c) => {
        const { data: parts } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', c.id);
        const otherId = (parts || []).find((p) => p.user_id !== userId)?.user_id;
        let participants: { id: string; name: string; email: string; avatar?: string }[] = [];
        if (otherId) {
          const { data: u } = await databaseService.getUserById(otherId);
          if (u) participants = [{ id: u.id, name: u.name, email: u.email, avatar: u.avatar }];
        }
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at, sender_id')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return { ...c, participants, last_message: lastMsg || undefined };
      })
    );
    return { data: withParticipants, error: null };
  },

  async getOrCreateConversation(userId: string, otherUserId: string) {
    const { data: myConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);
    const myIds = (myConvs || []).map((p) => p.conversation_id);
    if (myIds.length === 0) {
      const { data: newConv, error: createErr } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();
      if (createErr || !newConv) return { data: null, error: createErr };
      await supabase.from('conversation_participants').insert([
        { conversation_id: newConv.id, user_id: userId },
        { conversation_id: newConv.id, user_id: otherUserId },
      ]);
      return { data: newConv, error: null };
    }
    const { data: otherInConv } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', otherUserId)
      .in('conversation_id', myIds)
      .maybeSingle();
    if (otherInConv) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', otherInConv.conversation_id)
        .single();
      return { data: conv, error: null };
    }
    const { data: newConv, error: createErr } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();
    if (createErr || !newConv) return { data: null, error: createErr };
    await supabase.from('conversation_participants').insert([
      { conversation_id: newConv.id, user_id: userId },
      { conversation_id: newConv.id, user_id: otherUserId },
    ]);
    return { data: newConv, error: null };
  },

  async getMessages(conversationId: string, limit = 100) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);
    return { data: data || [], error };
  },

  async sendMessage(conversationId: string, senderId: string, content: string) {
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: senderId, content })
      .select()
      .single();
    return { data, error };
  },

  subscribeToMessages(conversationId: string, onMessage: (payload: any) => void) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => onMessage(payload)
      )
      .subscribe();
  },
};
