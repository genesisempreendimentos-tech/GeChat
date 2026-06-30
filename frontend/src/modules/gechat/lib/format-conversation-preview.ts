import type { Conversation, LastMessage } from '@/modules/gechat/types';
import { getMessagePreviewText } from '@/modules/gechat/lib/message-content';

export function formatLastMessagePreview(
  lastMessage: LastMessage | null | undefined,
  conversation: Conversation,
  currentUserId?: string,
  senderName?: string,
): string {
  if (!lastMessage?.content) {
    return conversation.type === 'group' ? 'Nenhuma mensagem ainda' : 'Inicie a conversa';
  }

  const text = getMessagePreviewText(lastMessage.content, lastMessage.type);
  const preview = text.length > 80 ? `${text.slice(0, 80)}…` : text;

  if (!preview) {
    return conversation.type === 'group' ? 'Nenhuma mensagem ainda' : 'Inicie a conversa';
  }

  if (conversation.type === 'group' || conversation.type === 'channel') {
    if (lastMessage.senderId === currentUserId) {
      return `Você: ${preview}`;
    }
    if (senderName) {
      return `${senderName}: ${preview}`;
    }
  }

  return preview;
}
