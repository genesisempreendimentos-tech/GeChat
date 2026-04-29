import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type SidebarContextValue = {
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(280);
  return (
    <SidebarContext.Provider value={{ sidebarWidth, setSidebarWidth }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarWidth() {
  const ctx = useContext(SidebarContext);
  return ctx?.sidebarWidth ?? 280;
}

export function useSetSidebarWidth() {
  const ctx = useContext(SidebarContext);
  return ctx?.setSidebarWidth ?? (() => {});
}
