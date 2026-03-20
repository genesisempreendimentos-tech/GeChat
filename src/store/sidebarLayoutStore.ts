import { create } from 'zustand';
import type { SidebarMode } from '@/lib/sidebarMode';
import { parseSidebarMode } from '@/lib/sidebarMode';
import { databaseService } from '@/services/supabase';

type SidebarLayoutState = {
  mode: SidebarMode;
  /** Aplica valor do perfil (login / sessão), sem gravar no Supabase. */
  applyFromProfile: (raw: string | null | undefined) => void;
  /** Atualiza UI e persiste em `profiles.sidebar` quando `userId` é informado. */
  setMode: (mode: SidebarMode, userId?: string | null) => Promise<{ error: unknown } | null>;
};

export const useSidebarLayoutStore = create<SidebarLayoutState>((set, get) => ({
  mode: 'hover',

  applyFromProfile: (raw) => {
    set({ mode: parseSidebarMode(raw) });
  },

  setMode: async (mode, userId) => {
    const prev = get().mode;
    set({ mode });
    if (!userId) return null;
    const { error } = await databaseService.updateProfileSidebar(userId, mode);
    if (error) {
      console.warn('[sidebar] Falha ao salvar no perfil:', error);
      set({ mode: prev });
      return { error };
    }
    return { error: null };
  },
}));
