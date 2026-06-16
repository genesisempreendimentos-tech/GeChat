import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppPanel } from '@/lib/panels';
import { panelFromPathname } from '@/lib/panels';

interface PanelState {
  activePanel: AppPanel;
  setActivePanel: (panel: AppPanel) => void;
  syncFromPathname: (pathname: string) => void;
}

export const usePanelStore = create<PanelState>()(
  persist(
    (set) => ({
      activePanel: 'user',
      setActivePanel: (panel) => set({ activePanel: panel }),
      syncFromPathname: (pathname) => {
        set({ activePanel: panelFromPathname(pathname) });
      },
    }),
    { name: 'geleads-panel' },
  ),
);
