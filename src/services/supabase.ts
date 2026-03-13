// Supabase Service Layer
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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

// Mapeamento: tabelas do Supabase (profiles, apps, user_app_access, audit_logs) <-> formato do app (User, System)
type ProfileRow = { id?: string; user_id?: string; full_name?: string; name?: string; avatar_url?: string; avatar?: string; role?: string; role_type?: string; user_type?: string; email?: string; created_at?: string; access_type?: string };
type UserShape = { id: string; name: string; email: string; role: string; avatar?: string; created_at?: string; createdAt?: Date; accessType?: string };
type CategoryRow = { id: string; name: string; description?: string; icon?: string; color?: string; created_at?: string; updated_at?: string; status?: string };

function profileToUser(row: ProfileRow | null, authEmail?: string): UserShape | null {
  if (!row) return null;
  const id = row.id ?? row.user_id ?? '';
  const rawRole = (row.role ?? row.role_type ?? row.user_type ?? 'user').toString().trim();
  const role = rawRole ? rawRole.toLowerCase() : 'user';
  return {
    id,
    name: (row.full_name ?? row.name) ?? '',
    email: row.email ?? authEmail ?? '',
    role,
    avatar: row.avatar_url ?? row.avatar,
    created_at: row.created_at,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    accessType: row.access_type ?? undefined,
  };
}

function userToProfilePayload(user: { name: string; email: string; role: string; avatar?: string }) {
  return {
    full_name: user.name,
    avatar_url: user.avatar,
    role: user.role,
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

  async signUp(email: string, password: string, fullName: string, role: 'admin' | 'manager' | 'user' = 'user') {
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
      const payloadWithId = { id: userId, full_name: fullName, avatar_url: avatarUrl, role, email };
      const payloadWithUserId = { user_id: userId, full_name: fullName, avatar_url: avatarUrl, role, email };

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
      .ilike('access_type', 'softadmin')
      .order('created_at', { ascending: false });
    if (error) return { data: null, error };
    const mapped = (data ?? []).map((row) => profileToUser(row as ProfileRow));
    return { data: mapped, error: null };
  },

  /** Usuários com access_type === 'appsadmin' na tabela profiles (acesso ao painel admin). */
  async getAppsAdmins() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('access_type', 'appsadmin')
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

  async getAdminCounts(): Promise<{ users: number; softadmins: number; apps: number }> {
    try {
      const [usersRes, adminsRes, appsRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).ilike('access_type', 'softadmin'),
        supabase.from('apps').select('*', { count: 'exact', head: true }),
      ]);
      return {
        users: usersRes.count ?? 0,
        softadmins: adminsRes.count ?? 0,
        apps: appsRes.count ?? 0,
      };
    } catch {
      return { users: 0, softadmins: 0, apps: 0 };
    }
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
    if (userData.role != null) payload.role = userData.role;
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
    if (userData.access_type != null) payload.access_type = userData.access_type;
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

  async toggleFavorite(userId: string, systemId: string) {
    const { data: current } = await supabase
      .from('user_app_access')
      .select('*')
      .eq('user_id', userId)
      .eq('app_id', systemId)
      .maybeSingle();

    const isFav = current ? !!(current.is_favorite ?? (current as any).favorite) : false;

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

  // Audit Logs (tabela audit_logs)
  async logAccess(userId: string, systemId: string) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert([{ user_id: userId, app_id: systemId }])
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
    const orderCol = 'timestamp'; // audit_logs: timestamp ou created_at
    let query = supabase
      .from('audit_logs')
      .select('*, profiles(*), apps(*)')
      .order(orderCol, { ascending: false })
      .limit(limit);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) return { data: null, error };
    const normalized = (data ?? []).map((row: any) => {
      const user = row.profiles ? profileToUser(row.profiles as ProfileRow) : null;
      const app = row.apps;
      return {
        ...row,
        system_id: row.app_id ?? row.system_id,
        systemId: row.app_id ?? row.system_id,
        userName: user?.name ?? row.userName,
        systemName: app?.name ?? row.systemName,
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
