// Supabase Service Layer
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
    return createClient(supabaseUrl!, supabaseAnonKey!);
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
type ProfileRow = { id?: string; user_id?: string; full_name?: string; name?: string; avatar_url?: string; avatar?: string; role?: string; role_type?: string; user_type?: string; email?: string; created_at?: string };
type UserShape = { id: string; name: string; email: string; role: string; avatar?: string; created_at?: string; createdAt?: Date };

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

// Storage Service
export const storageService = {
  async uploadAvatar(userId: string, file: File) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      console.log('📤 [Storage] Uploading avatar:', { userId, fileName, size: file.size });

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('❌ [Storage] Upload error:', error);
        throw error;
      }

      // Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
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
      const filePath = url.split('/avatars/')[1];
      if (!filePath) return { error: 'Invalid URL' };

      const { error } = await supabase.storage
        .from('avatars')
        .remove([`avatars/${filePath}`]);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('❌ [Storage] Delete error:', error);
      return { error };
    }
  }
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
      for (const key of ['id', 'user_id']) {
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

  async getUserById(userId: string) {
    for (const key of ['id', 'user_id']) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq(key, userId)
        .maybeSingle();
      if (!error && data) return { data: profileToUser(data as ProfileRow), error: null };
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

  async createUser(userData: any) {
    const payload = userToProfilePayload({
      name: userData.name,
      email: userData.email,
      role: userData.role ?? 'user',
      avatar: userData.avatar,
    });
    const { data, error } = await supabase
      .from('profiles')
      .insert([{ id: userData.id, ...payload }])
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
    for (const key of ['id', 'user_id']) {
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
    for (const key of ['id', 'user_id']) {
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

  // Converte uma linha da tabela apps do Supabase no formato usado pelo frontend
  appRowToSystem(row: any): any {
    const hasStatus = row.status !== undefined || row.active !== undefined;
    const active = hasStatus ? (row.status === 'active' || row.active === true) : true;
    return {
      id: row.id,
      name: row.name ?? row.title ?? '',
      description: row.description ?? '',
      url: row.url ?? '',
      icon: resolveSystemIcon(row),
      category: row.category ?? 'Ferramentas',
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

  async createSystem(systemData: any) {
    const slug =
      systemData.slug ??
      (systemData.name ? normalizeSlug(systemData.name) : '');
    const row: any = {
      name: systemData.name,
      url: systemData.url,
      description: systemData.description ?? '',
      status: systemData.active !== false ? 'active' : 'inactive',
      slug,
    };
    if (systemData.category != null) row.category = systemData.category;
    // Ícone: caminho ou nome do arquivo em /assets/systems/ (opcional; senão usa mapeamento por slug)
    const icon = systemData.icon ?? systemData.icon_url;
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
    if (systemData.icon != null || systemData.icon_url != null) row.icon_url = systemData.icon ?? systemData.icon_url;
    if (systemData.active != null) row.status = systemData.active ? 'active' : 'inactive';
    if (systemData.category != null) row.category = systemData.category;
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
