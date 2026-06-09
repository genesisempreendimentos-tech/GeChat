import { create } from 'zustand';
import { System, UserSystemAccess } from '@/types';

interface SystemState {
  systems: System[];
  userAccess: UserSystemAccess[];
  
  // Getters
  getAccessibleSystems: (userId: string) => System[];
  getFavoriteSystems: (userId: string) => System[];
  getSystemsByCategory: (category: string) => System[];
  
  // Actions
  toggleFavorite: (userId: string, systemId: string) => void;
  updateSystem: (systemId: string, data: Partial<System>) => void;
  addSystem: (system: System) => void;
  removeSystem: (systemId: string) => void;
  setUserAccess: (userId: string, systemId: string, canAccess: boolean) => void;
}

export const useSystemStore = create<SystemState>((set, get) => ({
  systems: [],
  userAccess: [],

  getAccessibleSystems: (userId: string) => {
    const { systems, userAccess } = get();
    const accessibleIds = userAccess
      .filter(access => access.userId === userId && access.canAccess)
      .map(access => access.systemId);
    
    return systems.filter(system => accessibleIds.includes(system.id) && system.active);
  },

  getFavoriteSystems: (userId: string) => {
    const { systems, userAccess } = get();
    const favoriteIds = userAccess
      .filter(access => access.userId === userId && access.isFavorite && access.canAccess)
      .map(access => access.systemId);
    
    return systems.filter(system => favoriteIds.includes(system.id) && system.active);
  },

  getSystemsByCategory: (category: string) => {
    const { systems } = get();
    return systems.filter(system => system.category === category && system.active);
  },

  toggleFavorite: (userId: string, systemId: string) => {
    set((state) => ({
      userAccess: state.userAccess.map(access =>
        access.userId === userId && access.systemId === systemId
          ? { ...access, isFavorite: !access.isFavorite }
          : access
      ),
    }));
  },

  updateSystem: (systemId: string, data: Partial<System>) => {
    set((state) => ({
      systems: state.systems.map(system =>
        system.id === systemId ? { ...system, ...data } : system
      ),
    }));
  },

  addSystem: (system: System) => {
    set((state) => ({
      systems: [...state.systems, system],
    }));
  },

  removeSystem: (systemId: string) => {
    set((state) => ({
      systems: state.systems.filter(system => system.id !== systemId),
      userAccess: state.userAccess.filter(access => access.systemId !== systemId),
    }));
  },

  setUserAccess: (userId: string, systemId: string, canAccess: boolean) => {
    set((state) => {
      const existingAccess = state.userAccess.find(
        access => access.userId === userId && access.systemId === systemId
      );

      if (existingAccess) {
        return {
          userAccess: state.userAccess.map(access =>
            access.userId === userId && access.systemId === systemId
              ? { ...access, canAccess }
              : access
          ),
        };
      } else {
        return {
          userAccess: [
            ...state.userAccess,
            {
              id: `access-${userId}-${systemId}`,
              userId,
              systemId,
              canAccess,
              isFavorite: false,
            },
          ],
        };
      }
    });
  },
}));
