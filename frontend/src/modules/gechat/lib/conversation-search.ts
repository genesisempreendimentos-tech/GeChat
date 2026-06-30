import type { Conversation } from '@/modules/gechat/types';
import { getMessagePreviewText } from '@/modules/gechat/lib/message-content';

export function filterConversations(list: Conversation[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((c) => {
    const name = (c.displayName ?? c.name ?? '').toLowerCase();
    const preview = c.lastMessage
      ? getMessagePreviewText(c.lastMessage.content, c.lastMessage.type).toLowerCase()
      : '';
    return name.includes(q) || preview.includes(q);
  });
}
