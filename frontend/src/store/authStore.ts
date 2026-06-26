import { create } from 'zustand';
import { User, UserRole } from '@/types';
import { authService, databaseService } from '@/services/supabase';
import { emitGeChatAuditAppLogin } from '@/assets/audit-log';
import { useThemeStore } from '@/store/themeStore';
import { useSidebarLayoutStore } from '@/store/sidebarLayoutStore';

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
    const { data, error } = await authService.signIn(email, password);
    if (error || !data || !data.user) {
      return { success: false, error: 'SENHA_INCORRETA' };
    }
    const { data: userData, error: userError } = await authService.getCurrentUser();
    if (userData) {
      useThemeStore.getState().applyFromProfileThema(undefined);
      useSidebarLayoutStore.getState().applyFromProfile(userData.sidebar);

      const user: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: (userData.accessType as UserRole) || 'user',
        avatar: userData.avatar,
        createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
        accessType: userData.accessType,
        sidebar: userData.sidebar,
      };
      set({ user, isAuthenticated: true, loading: false });
      void emitGeChatAuditAppLogin(user.id, user.email);
      return { success: true };
    }
    void userError;
    return { success: false, error: 'USUARIO_NAO_CADASTRADO' };
  },

  register: async (email: string, password: string, fullName: string) => {
    const { data, error } = await authService.signUp(email, password, fullName);
    if (error) {
      const errorMessage = (error as any).message || 'Erro ao criar conta';
      return { success: false, error: errorMessage };
    }

    if (!data || !data.user) {
      return { success: false, error: 'Erro ao criar usuário - dados inválidos' };
    }

    return { success: true };
  },

  logout: async () => {
    await authService.signOut();
    useSidebarLayoutStore.getState().applyFromProfile(undefined);
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
      useThemeStore.getState().applyFromProfileThema(undefined);
      useSidebarLayoutStore.getState().applyFromProfile(userData.sidebar);

      const user: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: (userData.accessType as UserRole) || 'user',
        avatar: userData.avatar,
        createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
        accessType: userData.accessType,
        sidebar: userData.sidebar,
      };
      set({ user, isAuthenticated: true, loading: false });
    } else {
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },
}));

// Estado de auth inicial (mock local)
useAuthStore.getState().checkAuth();
