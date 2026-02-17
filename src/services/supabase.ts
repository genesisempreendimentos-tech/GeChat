// Supabase Service Layer
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found. Using mock data.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

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
      console.log('🔵 [SignUp] Criando registro na tabela users...');

      // Criar registro na tabela users
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          name: fullName,
          email: email,
          role: role,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${fullName}`,
        }])
        .select()
        .single();

      if (dbError) {
        console.error('❌ [SignUp] Erro ao criar registro na tabela users:', dbError);
        return { 
          data: authData, 
          error: { 
            message: `Usuário criado no Auth mas falhou ao salvar dados: ${dbError.message}` 
          } 
        };
      }

      console.log('✅ [SignUp] Registro criado na tabela users:', userData);
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

      const { data: userData, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      return { data: userData, error: dbError };
    } catch (error) {
      console.error('❌ [AuthService] getCurrentUser exception:', error);
      return { data: null, error };
    }
  },
};

export const databaseService = {
  // Users
  async getUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async getUserById(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  async getUserByEmail(email: string) {
    console.log('🔍 [getUserByEmail] Verificando email:', email);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    console.log('🔍 [getUserByEmail] Resultado:', { data, error, exists: !!data });
    return { data, error };
  },

  async createUser(userData: any) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    return { data, error };
  },

  async updateUser(userId: string, userData: any) {
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },

  async deleteUser(userId: string) {
    console.log('🗑️ [deleteUser] Deletando usuário:', userId);
    
    // Deletar da tabela users
    const { data, error, count } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
      .select();
    
    if (error) {
      console.error('❌ [deleteUser] Erro ao deletar da tabela users:', error);
    } else {
      console.log('✅ [deleteUser] Resposta do delete:', { data, count, deletedRows: data?.length });
      if (!data || data.length === 0) {
        console.warn('⚠️ [deleteUser] Nenhuma linha foi deletada! Pode ser problema de RLS policy');
        return { 
          error: { 
            message: 'Nenhum registro foi deletado. Verifique as permissões RLS no Supabase.' 
          } 
        };
      }
      console.log('✅ [deleteUser] Usuário deletado da tabela users');
    }
    
    return { error };
  },

  // Systems
  async getSystems() {
    const { data, error } = await supabase
      .from('systems')
      .select('*')
      .eq('active', true)
      .order('name');
    return { data, error };
  },

  async getSystemById(systemId: string) {
    const { data, error } = await supabase
      .from('systems')
      .select('*')
      .eq('id', systemId)
      .single();
    return { data, error };
  },

  async createSystem(systemData: any) {
    const { data, error } = await supabase
      .from('systems')
      .insert([systemData])
      .select()
      .single();
    return { data, error };
  },

  async updateSystem(systemId: string, systemData: any) {
    const { data, error } = await supabase
      .from('systems')
      .update(systemData)
      .eq('id', systemId)
      .select()
      .single();
    return { data, error };
  },

  async deleteSystem(systemId: string) {
    const { error } = await supabase
      .from('systems')
      .delete()
      .eq('id', systemId);
    return { error };
  },

  // User System Access
  async getUserSystemAccess(userId: string) {
    const { data, error } = await supabase
      .from('user_systems')
      .select('*')
      .eq('user_id', userId);
    return { data, error };
  },

  async setUserSystemAccess(userId: string, systemId: string, canAccess: boolean) {
    const { data, error } = await supabase
      .from('user_systems')
      .upsert(
        {
          user_id: userId,
          system_id: systemId,
          can_access: canAccess,
        },
        {
          onConflict: 'user_id,system_id',
        }
      )
      .select()
      .single();
    return { data, error };
  },

  async toggleFavorite(userId: string, systemId: string) {
    const { data: current } = await supabase
      .from('user_systems')
      .select('*')
      .eq('user_id', userId)
      .eq('system_id', systemId)
      .maybeSingle();

    const cur = current as Record<string, unknown> | null;
    const isFav = cur ? !!(cur.is_favorite ?? cur.favorite) : false;
    const favCol = cur && Object.prototype.hasOwnProperty.call(cur, 'favorite') ? 'favorite' : 'is_favorite';

    if (current) {
      const { data, error } = await supabase
        .from('user_systems')
        .update({ [favCol]: !isFav })
        .eq('user_id', userId)
        .eq('system_id', systemId)
        .select()
        .single();
      return { data, error };
    }

    for (const col of ['favorite', 'is_favorite']) {
      const row: Record<string, unknown> = {
        user_id: userId,
        system_id: systemId,
        can_access: true,
        [col]: true,
      };
      const { data, error } = await supabase
        .from('user_systems')
        .upsert(row, { onConflict: 'user_id,system_id' })
        .select()
        .single();
      if (!error) return { data, error };
    }
    return { data: null, error: new Error('Não foi possível favoritar') };
  },

  // Access Logs
  async logAccess(userId: string, systemId: string) {
    try {
      const { data, error } = await supabase
        .from('access_logs')
        .insert([{
          user_id: userId,
          system_id: systemId,
        }])
        .select()
        .single();
      
      if (error) {
        console.warn('Falha ao registrar log de acesso:', error);
      }
      
      return { data, error };
    } catch (err) {
      console.warn('Erro ao registrar log de acesso:', err);
      return { data: null, error: err };
    }
  },

  async getAccessLogs(userId?: string, limit = 50) {
    let query = supabase
      .from('access_logs')
      .select('*, users(*), systems(*)')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    return { data, error };
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
