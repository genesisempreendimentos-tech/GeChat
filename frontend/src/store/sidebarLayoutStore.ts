import { create } from 'zustand';
import type { SidebarMode } from '@/lib/sidebarMode';
import { parseSidebarMode } from '@/lib/sidebarMode';
import { databaseService } from '@/services/supabase';

const STORAGE_KEY = 'gechat_sidebar_mode';

function readStoredMode(): SidebarMode {
  try {
    return parseSidebarMode(localStorage.getItem(STORAGE_KEY));
  } catch {
    return 'hover';
  }
}

function writeStoredMode(mode: SidebarMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

type SidebarLayoutState = {
  mode: SidebarMode;
  /** Aplica valor do perfil (login / sessão), sem gravar no Supabase. */
  applyFromProfile: (raw: string | null | undefined) => void;
  /** Atualiza UI e persiste localmente; Supabase é opcional (auth-only). */
  setMode: (mode: SidebarMode, userId?: string | null) => Promise<{ error: unknown } | null>;
};

export const useSidebarLayoutStore = create<SidebarLayoutState>((set, get) => ({
  mode: readStoredMode(),

  applyFromProfile: (raw) => {
    const mode = raw ? parseSidebarMode(raw) : readStoredMode();
    set({ mode });
    writeStoredMode(mode);
  },

  setMode: async (mode, userId) => {
    set({ mode });
    writeStoredMode(mode);
    if (!userId) return { error: null };
    const { error } = await databaseService.updateProfileSidebar(userId, mode);
    if (error) {
      console.warn('[sidebar] Falha ao salvar no perfil (mantendo preferência local):', error);
    }
    return { error: error ?? null };
  },
}));
