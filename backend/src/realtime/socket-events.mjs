import { getUserConversationIds, isMember, canPostInConversation } from '../services/gechat/membership.service.mjs';
import { createMessage, markConversationAsRead, updateMessageStatus, editMessage, deleteMessage } from '../services/gechat/message.service.mjs';
import { toggleReaction } from '../services/gechat/reaction.service.mjs';
import { getConversationById } from '../services/gechat/conversation.service.mjs';
import { getUserPrivacy, getPrivacyForUsers, maskPresenceForViewer } from '../services/gechat/privacy.service.mjs';
import { getPresenceForUsers } from '../services/gechat/presence.service.mjs';
import { conversationRoom, userRoom } from './rooms.mjs';
import {
  registerSocket,
  unregisterSocket,
  isUserOnline,
  getPresenceSnapshot,
} from './presence-manager.mjs';

export function registerSocketEvents(io, socket) {
  const userId = socket.data.userId;

  socket.on('message:send', async (payload, ack) => {
    try {
      const conversationId = payload?.conversationId;
      const content = String(payload?.content ?? '').trim();
      const type = payload?.type ?? 'text';
      const clientId = payload?.clientId;

      if (!conversationId || !content) {
        ack?.({ ok: false, error: 'Payload inválido.' });
        return;
      }

      const allowed = await canPostInConversation(conversationId, userId);
      if (!allowed) {
        ack?.({ ok: false, error: 'Sem permissão para enviar.' });
        return;
      }

      socket.join(conversationRoom(conversationId));

      const message = await createMessage({
        conversationId,
        senderId: userId,
        content,
        type,
      });

      const enriched = { ...message, clientId };
      io.to(conversationRoom(conversationId)).emit('message:new', enriched);
      socket.emit('message:sent', { messageId: message.id, clientId, status: 'sent' });

      const members = await import('../services/gechat/membership.service.mjs').then((m) =>
        m.getConversationMembers(conversationId),
      );
      let anyDelivered = false;
      for (const member of members) {
        if (member.user_id === userId) continue;
        if (isUserOnline(member.user_id)) {
          anyDelivered = true;
        }
      }
      if (anyDelivered) {
        await updateMessageStatus(message.id, 'delivered');
        socket.emit('message:delivered', { messageId: message.id, conversationId, status: 'delivered' });
      }

      const updatedConv = await getConversationById(conversationId, userId);
      io.to(conversationRoom(conversationId)).emit('conversation:updated', updatedConv);
      ack?.({ ok: true, message });
    } catch (err) {
      console.error('[socket message:send]', err);
      ack?.({ ok: false, error: err?.message ?? 'Erro ao enviar.' });
    }
  });

  socket.on('message:edit', async (payload, ack) => {
    try {
      const conversationId = payload?.conversationId;
      const messageId = payload?.messageId;
      const content = String(payload?.content ?? '').trim();

      if (!conversationId || !messageId || !content) {
        ack?.({ ok: false, error: 'Payload inválido.' });
        return;
      }

      const message = await editMessage(messageId, userId, content);
      if (message.conversationId !== conversationId) {
        ack?.({ ok: false, error: 'Conversa inválida.' });
        return;
      }

      io.to(conversationRoom(conversationId)).emit('message:updated', message);
      const updatedConv = await getConversationById(conversationId, userId);
      io.to(conversationRoom(conversationId)).emit('conversation:updated', updatedConv);
      ack?.({ ok: true, message });
    } catch (err) {
      console.error('[socket message:edit]', err);
      ack?.({ ok: false, error: err?.message ?? 'Erro ao editar.' });
    }
  });

  socket.on('message:delete', async (payload, ack) => {
    try {
      const conversationId = payload?.conversationId;
      const messageId = payload?.messageId;
      if (!conversationId || !messageId) {
        ack?.({ ok: false, error: 'Payload inválido.' });
        return;
      }

      const result = await deleteMessage(messageId, userId);
      if (result.conversationId !== conversationId) {
        ack?.({ ok: false, error: 'Conversa inválida.' });
        return;
      }

      io.to(conversationRoom(conversationId)).emit('message:deleted', result);
      const updatedConv = await getConversationById(conversationId, userId);
      io.to(conversationRoom(conversationId)).emit('conversation:updated', updatedConv);
      ack?.({ ok: true, ...result });
    } catch (err) {
      console.error('[socket message:delete]', err);
      ack?.({ ok: false, error: err?.message ?? 'Erro ao excluir.' });
    }
  });

  socket.on('reaction:toggle', async (payload, ack) => {
    try {
      const conversationId = payload?.conversationId;
      const messageId = payload?.messageId;
      const emoji = payload?.emoji;
      if (!conversationId || !messageId || !emoji) {
        ack?.({ ok: false, error: 'Payload inválido.' });
        return;
      }

      const result = await toggleReaction(messageId, userId, emoji);
      if (result.conversationId !== conversationId) {
        ack?.({ ok: false, error: 'Conversa inválida.' });
        return;
      }

      io.to(conversationRoom(conversationId)).emit('reaction:updated', result);
      ack?.({ ok: true, ...result });
    } catch (err) {
      console.error('[socket reaction:toggle]', err);
      ack?.({ ok: false, error: err?.message ?? 'Erro ao reagir.' });
    }
  });

  socket.on('typing:start', async (payload) => {
    const conversationId = payload?.conversationId;
    if (!conversationId) return;
    if (!(await isMember(conversationId, userId))) return;
    socket.to(conversationRoom(conversationId)).emit('typing:start', {
      conversationId,
      userId,
      userName: socket.data.profile?.name ?? 'Usuário',
    });
  });

  socket.on('typing:stop', async (payload) => {
    const conversationId = payload?.conversationId;
    if (!conversationId) return;
    if (!(await isMember(conversationId, userId))) return;
    socket.to(conversationRoom(conversationId)).emit('typing:stop', {
      conversationId,
      userId,
    });
  });

  socket.on('message:read', async (payload) => {
    try {
      const conversationId = payload?.conversationId;
      if (!conversationId) return;
      const result = await markConversationAsRead(conversationId, userId);
      if (result.receiptsSent === false) return;
      io.to(conversationRoom(conversationId)).emit('message:read', {
        conversationId,
        userId,
        readAt: result.readAt,
      });
      const updatedConv = await getConversationById(conversationId, userId);
      io.to(conversationRoom(conversationId)).emit('conversation:updated', updatedConv);
    } catch (err) {
      console.error('[socket message:read]', err);
    }
  });

  socket.on('conversation:join', async (payload) => {
    const conversationId = payload?.conversationId;
    if (!conversationId) return;
    if (!(await isMember(conversationId, userId))) return;
    socket.join(conversationRoom(conversationId));
  });

  socket.on('disconnect', async () => {
    const disconnectedUserId = unregisterSocket(socket.id);
    if (!disconnectedUserId) return;

    if (!isUserOnline(disconnectedUserId)) {
      const privacy = await getUserPrivacy(disconnectedUserId);
      if (!privacy.lastSeenVisible) return;

      const convIds = await getUserConversationIds(disconnectedUserId);
      for (const convId of convIds) {
        socket.to(conversationRoom(convId)).emit('presence:offline', {
          userId: disconnectedUserId,
        });
      }
      socket.to(userRoom(disconnectedUserId)).emit('presence:offline', {
        userId: disconnectedUserId,
      });
    }
  });
}

export async function handleSocketConnection(io, socket, appLocals) {
  const userId = socket.data.userId;
  registerSocket(userId, socket.id);
  socket.join(userRoom(userId));

  const conversationIds = await getUserConversationIds(userId);
  for (const id of conversationIds) {
    socket.join(conversationRoom(id));
  }

  const relatedUserIds = new Set();
  for (const convId of conversationIds) {
    const members = await import('../services/gechat/membership.service.mjs').then((m) =>
      m.getConversationMembers(convId),
    );
    for (const m of members) {
      if (m.user_id !== userId) relatedUserIds.add(m.user_id);
    }
  }

  const viewerPrivacy = await getUserPrivacy(userId);
  const privacyMap = await getPrivacyForUsers([userId, ...relatedUserIds]);
  const dbPresence = await getPresenceForUsers([userId, ...relatedUserIds]);
  const onlineSnapshot = getPresenceSnapshot([userId, ...relatedUserIds]);

  const presenceForSocket = {};
  for (const id of [userId, ...relatedUserIds]) {
    const db = dbPresence.find((p) => p.user_id === id);
    const raw = {
      online: onlineSnapshot[id]?.online ?? false,
      lastSeenAt: db?.last_seen_at ?? null,
    };
    presenceForSocket[id] = maskPresenceForViewer(
      viewerPrivacy,
      id,
      privacyMap[id],
      raw,
    );
  }
  socket.emit('presence:update', presenceForSocket);

  const selfPrivacy = privacyMap[userId];
  if (!selfPrivacy?.lastSeenVisible) return;

  for (const relatedId of relatedUserIds) {
    io.to(userRoom(relatedId)).emit('presence:online', { userId });
    for (const convId of conversationIds) {
      socket.to(conversationRoom(convId)).emit('presence:online', { userId });
    }
  }
}
