import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConversationListState {
  favoriteIds: string[];
  pinnedIds: string[];
  archivedIds: string[];
  mutedIds: string[];
  toggleFavorite: (conversationId: string) => void;
  togglePin: (conversationId: string) => void;
  archive: (conversationId: string) => void;
  unarchive: (conversationId: string) => void;
  setMuted: (conversationId: string, muted: boolean) => void;
  isFavorite: (conversationId: string) => boolean;
  isPinned: (conversationId: string) => boolean;
  isArchived: (conversationId: string) => boolean;
  isMuted: (conversationId: string) => boolean;
}

export const useConversationListStore = create<ConversationListState>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      pinnedIds: [],
      archivedIds: [],
      mutedIds: [],

      toggleFavorite: (conversationId) =>
        set((state) => {
          const exists = state.favoriteIds.includes(conversationId);
          return {
            favoriteIds: exists
              ? state.favoriteIds.filter((id) => id !== conversationId)
              : [...state.favoriteIds, conversationId],
          };
        }),

      togglePin: (conversationId) =>
        set((state) => {
          const exists = state.pinnedIds.includes(conversationId);
          return {
            pinnedIds: exists
              ? state.pinnedIds.filter((id) => id !== conversationId)
              : [...state.pinnedIds, conversationId],
          };
        }),

      archive: (conversationId) =>
        set((state) => ({
          archivedIds: state.archivedIds.includes(conversationId)
            ? state.archivedIds
            : [...state.archivedIds, conversationId],
          pinnedIds: state.pinnedIds.filter((id) => id !== conversationId),
        })),

      unarchive: (conversationId) =>
        set((state) => ({
          archivedIds: state.archivedIds.filter((id) => id !== conversationId),
        })),

      setMuted: (conversationId, muted) =>
        set((state) => {
          const exists = state.mutedIds.includes(conversationId);
          if (muted && !exists) {
            return { mutedIds: [...state.mutedIds, conversationId] };
          }
          if (!muted && exists) {
            return { mutedIds: state.mutedIds.filter((id) => id !== conversationId) };
          }
          return state;
        }),

      isFavorite: (conversationId) => get().favoriteIds.includes(conversationId),
      isPinned: (conversationId) => get().pinnedIds.includes(conversationId),
      isArchived: (conversationId) => get().archivedIds.includes(conversationId),
      isMuted: (conversationId) => get().mutedIds.includes(conversationId),
    }),
    { name: 'gechat-conversation-list' },
  ),
);
