import { create } from 'zustand';
import { User } from '@/types';
import { authService } from '@/services/supabase';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,

  login: async (email: string, password: string) => {
    console.log('🔵 [Login] Iniciando login:', email);
    
    // Validar domínio permitido
    const allowedDomain = '@genesisempreendimentos.com.br';
    if (!email.endsWith(allowedDomain)) {
      console.log('❌ [Login] Domínio inválido');
      return { success: false, error: 'Acesso restrito: Apenas colaboradores da Genesis Empreendimentos podem acessar o GêApps' };
    }

    console.log('🔵 [Login] Chamando authService.signIn...');
    const { data, error } = await authService.signIn(email, password);
    
    console.log('🔵 [Login] Resposta do signIn:', { data, error });
    
    if (error || !data || !data.user) {
      console.error('❌ [Login] Erro na autenticação:', error);
      return { success: false, error: 'Email ou senha inválidos' };
    }

    console.log('✅ [Login] Autenticação bem-sucedida! User ID:', data.user.id);
    console.log('🔵 [Login] Buscando dados completos do usuário...');
    
    // Buscar dados completos do usuário
    const { data: userData, error: userError } = await authService.getCurrentUser();
    
    console.log('🔵 [Login] Dados do usuário retornados:', { userData, userError });
    
    if (userData) {
      const user: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        avatar: userData.avatar,
        createdAt: userData.created_at ? new Date(userData.created_at) : new Date(),
      };
      
      console.log('✅ [Login] Login completo! Usuário:', user);
      console.log('✅ [Login] Role detalhado:', {
        role: user.role,
        roleType: typeof user.role,
        roleLength: user.role?.length,
        isAdmin: user.role === 'admin',
        isManager: user.role === 'manager',
        roleRaw: JSON.stringify(user.role)
      });
      set({ user, isAuthenticated: true });
      return { success: true };
    }
    
    console.error('❌ [Login] Usuário não encontrado na tabela profiles. Erro:', userError);
    return { success: false, error: 'USUARIO_NAO_CADASTRADO' };
  },

  register: async (email: string, password: string, fullName: string) => {
    console.log('🟢 [Register] Iniciando registro:', { email, fullName });
    
    const { data, error } = await authService.signUp(email, password, fullName);
    
    console.log('🟢 [Register] Resultado:', { data, error });
    
    if (error) {
      const errorMessage = (error as any).message || 'Erro ao criar conta';
      console.error('❌ [Register] Erro:', errorMessage);
      return { success: false, error: errorMessage };
    }

    if (!data || !data.user) {
      console.error('❌ [Register] Dados inválidos retornados');
      return { success: false, error: 'Erro ao criar usuário - dados inválidos' };
    }

    console.log('✅ [Register] Registro concluído com sucesso!');
    return { success: true };
  },

  logout: async () => {
    await authService.signOut();
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (userData: Partial<User>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null,
    }));
  },

  checkAuth: async () => {
    const { data: userData } = await authService.getCurrentUser();
    
    if (userData) {
      const user: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        avatar: userData.avatar,
        createdAt: userData.created_at ? new Date(userData.created_at) : new Date(),
      };
      set({ user, isAuthenticated: true, loading: false });
    } else {
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },
}));

// Initialize auth state from Supabase session
useAuthStore.getState().checkAuth();
