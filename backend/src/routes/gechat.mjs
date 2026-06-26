import express from 'express';
import { requireGeChatAuth } from '../middleware/requireGeChatAuth.mjs';
import { getUserConversations, createDirectConversation, createGroup, createChannel } from '../services/gechat/conversation.service.mjs';
import {
  getGroupSettings,
  updateGroupDetails,
  updateMemberSettings,
  addGroupMembers,
} from '../services/gechat/group-settings.service.mjs';
import { getConversationMessages, markConversationAsRead, editMessage, deleteMessage } from '../services/gechat/message.service.mjs';
import { toggleReaction } from '../services/gechat/reaction.service.mjs';
import { getConversationMembers } from '../services/gechat/membership.service.mjs';
import { getPresenceForUsers } from '../services/gechat/presence.service.mjs';
import { enrichProfiles } from '../services/gechat/profile-enrichment.service.mjs';
import {
  getUserPrivacy,
  getPrivacyForUsers,
  updateUserPrivacy,
  maskPresenceForViewer,
} from '../services/gechat/privacy.service.mjs';
import { getUserConversationIds } from '../services/gechat/membership.service.mjs';
import { getPresenceSnapshot } from '../realtime/presence-manager.mjs';
import { conversationRoom } from '../realtime/rooms.mjs';
import { getSql } from '../db/neon.mjs';

async function buildConversationList(userId, appLocals) {
  const conversations = await getUserConversations(userId);
  const sql = getSql();

  const enriched = [];
  const profileIds = new Set();

  for (const conv of conversations) {
    const members = await sql`
      SELECT user_id FROM gechat_conversation_members
      WHERE conversation_id = ${conv.id}
    `;
    const memberIds = members.map((m) => m.user_id);
    memberIds.forEach((id) => profileIds.add(id));

    let otherMemberId = null;
    if (conv.type === 'direct') {
      otherMemberId = memberIds.find((id) => id !== userId) ?? null;
      if (otherMemberId) profileIds.add(otherMemberId);
    }

    enriched.push({ ...conv, memberIds, otherMemberId });
  }

  const profileMap = await enrichProfiles(
    appLocals.supabaseUrl,
    appLocals.supabaseServiceRoleKey,
    [...profileIds],
  );

  return enriched.map((conv) => {
    if (conv.type === 'direct' && conv.otherMemberId) {
      const profile = profileMap[conv.otherMemberId];
      return {
        ...conv,
        displayName: profile?.name ?? 'Conversa',
        avatar: profile?.avatar,
        otherMember: profile,
      };
    }
    return {
      ...conv,
      displayName: conv.name ?? (conv.type === 'channel' ? 'Canal' : 'Grupo'),
      avatar: conv.avatar ?? undefined,
    };
  });
}

export function createGeChatRouter() {
  const router = express.Router();

  router.use((req, res, next) => {
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({ error: 'GêChat indisponível: DATABASE_URL não configurada.' });
    }
    next();
  });

  router.use(requireGeChatAuth);

  router.get('/conversations', async (req, res) => {
    try {
      const list = await buildConversationList(req.gechatUser.id, req.app.locals);
      res.json({ conversations: list });
    } catch (err) {
      console.error('[gechat/conversations]', err);
      res.status(500).json({ error: 'Erro ao listar conversas.' });
    }
  });

  router.get('/conversations/:id/messages', async (req, res) => {
    try {
      const { messages, nextCursor } = await getConversationMessages(
        req.params.id,
        req.gechatUser.id,
        { cursor: req.query.cursor, limit: req.query.limit },
      );
      res.json({ messages, nextCursor });
    } catch (err) {
      const status = err?.status ?? 500;
      res.status(status).json({ error: err?.message ?? 'Erro ao carregar mensagens.' });
    }
  });

  router.patch('/conversations/:conversationId/messages/:messageId', async (req, res) => {
    try {
      const message = await editMessage(
        req.params.messageId,
        req.gechatUser.id,
        req.body?.content,
      );
      res.json({ message });
    } catch (err) {
      const status = err?.status ?? 500;
      res.status(status).json({ error: err?.message ?? 'Erro ao editar mensagem.' });
    }
  });

  router.delete('/conversations/:conversationId/messages/:messageId', async (req, res) => {
    try {
      const result = await deleteMessage(req.params.messageId, req.gechatUser.id);
      res.json(result);
    } catch (err) {
      const status = err?.status ?? 500;
      res.status(status).json({ error: err?.message ?? 'Erro ao excluir mensagem.' });
    }
  });

  router.post('/conversations/:conversationId/messages/:messageId/reactions', async (req, res) => {
    try {
      const result = await toggleReaction(
        req.params.messageId,
        req.gechatUser.id,
        req.body?.emoji,
      );
      res.json(result);
    } catch (err) {
      const status = err?.status ?? 500;
      res.status(status).json({ error: err?.message ?? 'Erro ao reagir.' });
    }
  });

  router.get('/conversations/:id/members', async (req, res) => {
    try {
      const members = await getConversationMembers(req.params.id);
      const profileMap = await enrichProfiles(
        req.app.locals.supabaseUrl,
        req.app.locals.supabaseServiceRoleKey,
        members.map((m) => m.user_id),
      );
      res.json({
        members: members.map((m) => ({
          id: m.id,
          conversationId: m.conversation_id,
          userId: m.user_id,
          role: m.role,
          lastReadAt: m.last_read_at,
          joinedAt: m.joined_at,
          profile: profileMap[m.user_id],
        })),
      });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao carregar membros.' });
    }
  });

  router.post('/conversations/:id/read', async (req, res) => {
    try {
      const result = await markConversationAsRead(req.params.id, req.gechatUser.id);
      res.json(result);
    } catch (err) {
      const status = err?.status ?? 500;
      res.status(status).json({ error: err?.message ?? 'Erro ao marcar como lida.' });
    }
  });

  router.post('/conversations/direct', async (req, res) => {
    try {
      const targetUserId = String(req.body?.targetUserId ?? '').trim();
      if (!targetUserId) return res.status(400).json({ error: 'targetUserId é obrigatório.' });
      const conv = await createDirectConversation(req.gechatUser.id, targetUserId);
      const [enriched] = await buildConversationList(req.gechatUser.id, req.app.locals).then((list) =>
        list.filter((c) => c.id === conv.id),
      );
      res.json({ conversation: enriched ?? conv });
    } catch (err) {
      const status = err?.status ?? 500;
      res.status(status).json({ error: err?.message ?? 'Erro ao criar conversa.' });
    }
  });

  router.post('/conversations/group', async (req, res) => {
    try {
      const conv = await createGroup({
        name: req.body?.name,
        description: req.body?.description,
        avatarUrl: req.body?.avatarUrl,
        memberIds: req.body?.memberIds ?? [],
        creatorId: req.gechatUser.id,
      });
      res.json({ conversation: conv });
    } catch (err) {
      const status = err?.status ?? 500;
      res.status(status).json({ error: err?.message ?? 'Erro ao criar grupo.' });
    }
  });

  router.post('/conversations/channel', async (req, res) => {
    try {
      const conv = await createChannel({
        name: req.body?.name,
        channelSubtype: req.body?.channelSubtype ?? 'geral',
        memberIds: req.body?.memberIds ?? [],
        creatorId: req.gechatUser.id,
      });
      res.json({ conversation: conv });
    } catch (err) {
      const status = err?.status ?? 500;
      res.status(status).json({ error: err?.message ?? 'Erro ao criar canal.' });
    }
  });

  router.get('/conversations/:id/group-settings', async (req, res) => {
    try {
      const { conversation, mySettings, members } = await getGroupSettings(
        req.params.id,
        req.gechatUser.id,
      );
      const profileMap = await enrichProfiles(
        req.app.locals.supabaseUrl,
        req.app.locals.supabaseServiceRoleKey,
        members.map((m) => m.user_id),
      );
      res.json({
        conversation,
        mySettings,
        members: members.map((m) => ({
          id: m.id,
          conversationId: m.conversation_id,
          userId: m.user_id,
          role: m.role,
          lastReadAt: m.last_read_at,
          joinedAt: m.joined_at,
          profile: profileMap[m.user_id],
        })),
      });
    } catch (err) {
      const status = err?.status ?? 500;
      res.status(status).json({ error: err?.message ?? 'Erro ao carregar configurações do grupo.' });
    }
  });

  router.patch('/conversations/:id/group', async (req, res) => {
    try {
      const conversation = await updateGroupDetails(req.params.id, req.gechatUser.id, {
        name: req.body?.name,
        description: req.body?.description,
        avatarUrl: req.body?.avatarUrl,
        onlyAdminsCanEdit: req.body?.onlyAdminsCanEdit,
        onlyAdminsCanSend: req.body?.onlyAdminsCanSend,
      });
      res.json({ conversation });
    } catch (err) {
      const status = err?.status ?? 500;
      res.status(status).json({ error: err?.message ?? 'Erro ao atualizar grupo.' });
    }
  });

  router.patch('/conversations/:id/member-settings', async (req, res) => {
    try {
      const mySettings = await updateMemberSettings(req.params.id, req.gechatUser.id, {
        muted: req.body?.muted,
        notificationsEnabled: req.body?.notificationsEnabled,
      });
      res.json({ mySettings });
    } catch (err) {
      const status = err?.status ?? 500;
      res.status(status).json({ error: err?.message ?? 'Erro ao salvar preferências.' });
    }
  });

  router.post('/conversations/:id/members', async (req, res) => {
    try {
      const memberIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds : [];
      const addedIds = await addGroupMembers(req.params.id, req.gechatUser.id, memberIds);
      const members = await getConversationMembers(req.params.id);
      const profileMap = await enrichProfiles(
        req.app.locals.supabaseUrl,
        req.app.locals.supabaseServiceRoleKey,
        members.map((m) => m.user_id),
      );
      res.json({
        addedIds,
        members: members.map((m) => ({
          id: m.id,
          conversationId: m.conversation_id,
          userId: m.user_id,
          role: m.role,
          lastReadAt: m.last_read_at,
          joinedAt: m.joined_at,
          profile: profileMap[m.user_id],
        })),
      });
    } catch (err) {
      const status = err?.status ?? 500;
      res.status(status).json({ error: err?.message ?? 'Erro ao adicionar membros.' });
    }
  });

  router.get('/presence', async (req, res) => {
    try {
      const viewerId = req.gechatUser.id;
      const raw = String(req.query.userIds ?? '');
      const userIds = raw.split(',').map((s) => s.trim()).filter(Boolean);
      const viewerPrivacy = await getUserPrivacy(viewerId);
      const targetPrivacyMap = await getPrivacyForUsers(userIds);
      const dbPresence = await getPresenceForUsers(userIds);
      const onlineSnapshot = getPresenceSnapshot(userIds);
      const map = {};
      for (const id of userIds) {
        const db = dbPresence.find((p) => p.user_id === id);
        const rawPresence = {
          online: onlineSnapshot[id]?.online ?? false,
          lastSeenAt: db?.last_seen_at ?? null,
        };
        map[id] = maskPresenceForViewer(
          viewerPrivacy,
          id,
          targetPrivacyMap[id],
          rawPresence,
        );
      }
      res.json({ presence: map });
    } catch (err) {
      console.error('[gechat/presence]', err);
      res.status(500).json({ error: 'Erro ao carregar presença.' });
    }
  });

  router.get('/privacy', async (req, res) => {
    try {
      const privacy = await getUserPrivacy(req.gechatUser.id);
      res.json({ privacy });
    } catch (err) {
      console.error('[gechat/privacy]', err);
      res.status(500).json({ error: 'Erro ao carregar privacidade.' });
    }
  });

  router.patch('/privacy', async (req, res) => {
    try {
      const userId = req.gechatUser.id;
      const previous = await getUserPrivacy(userId);
      const privacy = await updateUserPrivacy(userId, {
        readReceiptsEnabled: req.body?.readReceiptsEnabled,
        lastSeenVisible: req.body?.lastSeenVisible,
      });

      const io = req.app.locals.io;
      if (io && previous.lastSeenVisible && !privacy.lastSeenVisible) {
        const convIds = await getUserConversationIds(userId);
        for (const convId of convIds) {
          io.to(conversationRoom(convId)).emit('presence:offline', { userId });
        }
      } else if (io && !previous.lastSeenVisible && privacy.lastSeenVisible) {
        const convIds = await getUserConversationIds(userId);
        for (const convId of convIds) {
          io.to(conversationRoom(convId)).emit('presence:online', { userId });
        }
      }

      res.json({ privacy });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao salvar privacidade.' });
    }
  });

  router.get('/users', async (req, res) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const { supabaseUrl, supabaseServiceRoleKey } = req.app.locals;
      if (!supabaseServiceRoleKey) {
        return res.status(500).json({ error: 'Service role não configurada.' });
      }
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
      const search = String(req.query.search ?? '').trim().toLowerCase();
      let query = supabase
        .from('profiles')
        .select('user_id, id, full_name, name, email, avatar_url, avatar, profile_status, apelido')
        .or('profile_status.is.null,profile_status.eq.active')
        .order('full_name', { ascending: true, nullsFirst: false });

      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });

      let users = (data ?? [])
        .filter((row) => {
          const id = String(row.user_id ?? row.id);
          return id && id !== req.gechatUser.id;
        })
        .map((row) => ({
          id: String(row.user_id ?? row.id),
          name:
            row.full_name ??
            row.name ??
            row.apelido ??
            row.email?.split('@')[0] ??
            'Usuário',
          email: row.email,
          avatar: row.avatar_url ?? row.avatar,
        }));

      if (search) {
        users = users.filter((u) => {
          const haystack = `${u.name} ${u.email ?? ''}`.toLowerCase();
          return haystack.includes(search);
        });
      }

      res.json({ users });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao listar usuários.' });
    }
  });

  return router;
}
