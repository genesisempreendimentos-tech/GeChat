import { io, type Socket } from 'socket.io-client';
import type { Message, MessageReaction, SendMessagePayload } from '@/modules/gechat/types';

type EventHandler = (...args: unknown[]) => void;

let socket: Socket | null = null;
const handlers = new Map<string, Set<EventHandler>>();

async function getAccessToken(): Promise<string | null> {
  const response = await fetch('/api/auth/access-token', { credentials: 'include' });
  if (!response.ok) return null;
  const data = await response.json();
  return data.accessToken ?? null;
}

function bindSocketEvents(s: Socket) {
  const events = [
    'message:new',
    'message:updated',
    'message:deleted',
    'reaction:updated',
    'message:sent',
    'message:delivered',
    'message:read',
    'typing:start',
    'typing:stop',
    'presence:online',
    'presence:offline',
    'presence:update',
    'conversation:updated',
    'connect',
    'disconnect',
    'connect_error',
  ];
  for (const event of events) {
    s.on(event, (...args) => {
      handlers.get(event)?.forEach((fn) => fn(...args));
    });
  }
}

export const gechatSocket = {
  on(event: string, handler: EventHandler) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event)!.add(handler);
    return () => handlers.get(event)?.delete(handler);
  },

  async connect(): Promise<Socket | null> {
    if (socket?.connected) return socket;

    const token = await getAccessToken();
    if (!token) return null;

    if (socket) {
      socket.auth = { token };
      socket.connect();
      return socket;
    }

    socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      auth: { token },
    });

    bindSocketEvents(socket);

    socket.io.on('reconnect_attempt', async () => {
      const freshToken = await getAccessToken();
      if (freshToken && socket) socket.auth = { token: freshToken };
    });

    return socket;
  },

  disconnect() {
    socket?.disconnect();
    socket = null;
  },

  getSocket() {
    return socket;
  },

  sendMessage(payload: SendMessagePayload): Promise<{ ok: boolean; message?: Message; error?: string }> {
    return new Promise((resolve) => {
      if (!socket?.connected) {
        resolve({ ok: false, error: 'Desconectado.' });
        return;
      }
      socket.emit('message:send', payload, (response: { ok: boolean; message?: Message; error?: string }) => {
        resolve(response ?? { ok: false, error: 'Sem resposta.' });
      });
    });
  },

  editMessage(payload: {
    conversationId: string;
    messageId: string;
    content: string;
  }): Promise<{ ok: boolean; message?: Message; error?: string }> {
    return new Promise((resolve) => {
      if (!socket?.connected) {
        resolve({ ok: false, error: 'Desconectado.' });
        return;
      }
      socket.emit('message:edit', payload, (response: { ok: boolean; message?: Message; error?: string }) => {
        resolve(response ?? { ok: false, error: 'Sem resposta.' });
      });
    });
  },

  deleteMessage(payload: {
    conversationId: string;
    messageId: string;
  }): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    return new Promise((resolve) => {
      if (!socket?.connected) {
        resolve({ ok: false, error: 'Desconectado.' });
        return;
      }
      socket.emit(
        'message:delete',
        payload,
        (response: { ok: boolean; messageId?: string; error?: string }) => {
          resolve(response ?? { ok: false, error: 'Sem resposta.' });
        },
      );
    });
  },

  toggleReaction(payload: {
    conversationId: string;
    messageId: string;
    emoji: string;
  }): Promise<{
    ok: boolean;
    messageId?: string;
    conversationId?: string;
    reactions?: MessageReaction[];
    error?: string;
  }> {
    return new Promise((resolve) => {
      if (!socket?.connected) {
        resolve({ ok: false, error: 'Desconectado.' });
        return;
      }
      socket.emit(
        'reaction:toggle',
        payload,
        (response: {
          ok: boolean;
          messageId?: string;
          conversationId?: string;
          reactions?: MessageReaction[];
          error?: string;
        }) => {
          resolve(response ?? { ok: false, error: 'Sem resposta.' });
        },
      );
    });
  },

  markRead(conversationId: string) {
    socket?.emit('message:read', { conversationId });
  },

  emitTypingStart(conversationId: string) {
    socket?.emit('typing:start', { conversationId });
  },

  emitTypingStop(conversationId: string) {
    socket?.emit('typing:stop', { conversationId });
  },

  joinConversation(conversationId: string) {
    socket?.emit('conversation:join', { conversationId });
  },
};
