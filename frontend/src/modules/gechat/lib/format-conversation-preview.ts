import type { Conversation, LastMessage } from '@/modules/gechat/types';

function plainFromContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return '';

  try {
    const data = JSON.parse(trimmed);
    if (data?.kind === 'sticker' && data.emoji) return String(data.emoji);
    if (data?.kind === 'image' || data?.url) return 'Foto';
    if (data?.kind === 'file') return data.name ? `Arquivo: ${data.name}` : 'Arquivo';
    if (data?.kind === 'link') return data.title ? String(data.title) : 'Link';
    if (typeof data?.text === 'string') return data.text;
  } catch {
    /* texto simples */
  }

  return trimmed.replace(/\s+/g, ' ');
}

export function formatLastMessagePreview(
  lastMessage: LastMessage | null | undefined,
  conversation: Conversation,
  currentUserId?: string,
  senderName?: string,
): string {
  if (!lastMessage?.content) {
    return conversation.type === 'group' ? 'Nenhuma mensagem ainda' : 'Inicie a conversa';
  }

  const text = plainFromContent(lastMessage.content);
  const preview = text.length > 80 ? `${text.slice(0, 80)}…` : text;

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
