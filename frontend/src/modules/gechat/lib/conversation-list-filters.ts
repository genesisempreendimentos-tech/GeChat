import type { LucideIcon } from 'lucide-react';
import {
  MessageSquareWarning,
  MessagesSquare,
  Rss,
  Star,
  Users,
} from 'lucide-react';
import type { Conversation } from '@/modules/gechat/types';
import { filterConversations } from '@/modules/gechat/lib/conversation-search';

export type ConversationListFilter = 'all' | 'unread' | 'favorites' | 'groups' | 'channels';

export const CONVERSATION_LIST_FILTERS: Array<{
  id: ConversationListFilter;
  label: string;
  icon: LucideIcon;
}> = [
  { id: 'all', label: 'Tudo', icon: MessagesSquare },
  { id: 'unread', label: 'Não lidas', icon: MessageSquareWarning },
  { id: 'favorites', label: 'Favoritas', icon: Star },
  { id: 'groups', label: 'Grupos', icon: Users },
  { id: 'channels', label: 'Canais', icon: Rss },
];

export function sortConversationsForList(
  conversations: Conversation[],
  pinnedIds: string[],
  unreadCounters: Record<string, number> = {},
  typingByConversation: Record<string, string[]> = {},
) {
  const pinnedSet = new Set(pinnedIds);

  const unreadCount = (c: Conversation) => unreadCounters[c.id] ?? c.unreadCount ?? 0;
  const isTyping = (c: Conversation) =>
    (typingByConversation[c.id] ?? []).length > 0;

  return [...conversations].sort((a, b) => {
    const aPinned = pinnedSet.has(a.id);
    const bPinned = pinnedSet.has(b.id);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;

    const aUnread = unreadCount(a) > 0;
    const bUnread = unreadCount(b) > 0;
    if (aUnread !== bUnread) return aUnread ? -1 : 1;

    const aTyping = isTyping(a);
    const bTyping = isTyping(b);
    if (aTyping !== bTyping) return aTyping ? -1 : 1;

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function applyConversationListFilter(
  conversations: Conversation[],
  filter: ConversationListFilter,
  options: {
    searchQuery: string;
    favoriteIds: string[];
    archivedIds: string[];
    unreadCounters: Record<string, number>;
    showArchived: boolean;
  },
) {
  const { searchQuery, favoriteIds, archivedIds, unreadCounters, showArchived } = options;
  const archivedSet = new Set(archivedIds);
  const favoriteSet = new Set(favoriteIds);

  let list = filterConversations(conversations, searchQuery);

  list = list.filter((c) =>
    showArchived ? archivedSet.has(c.id) : !archivedSet.has(c.id),
  );

  if (!showArchived) {
    switch (filter) {
      case 'unread':
        list = list.filter((c) => (unreadCounters[c.id] ?? c.unreadCount ?? 0) > 0);
        break;
      case 'favorites':
        list = list.filter((c) => favoriteSet.has(c.id));
        break;
      case 'groups':
        list = list.filter((c) => c.type === 'group');
        break;
      case 'channels':
        list = list.filter((c) => c.type === 'channel');
        break;
      default:
        break;
    }
  }

  return list;
}
