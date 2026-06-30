import { getSql } from '../../db/neon.mjs';
import { getUnreadCount } from './message.service.mjs';
import { getConversationMembers, isMember } from './membership.service.mjs';

function mapConversation(row, extras = {}) {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description ?? null,
    avatar: row.avatar_url ?? undefined,
    onlyAdminsCanEdit: Boolean(row.only_admins_can_edit),
    onlyAdminsCanSend: Boolean(row.only_admins_can_send),
    channelSubtype: row.channel_subtype,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...extras,
  };
}

async function attachLastMessageAndUnread(conversations, userId) {
  const sql = getSql();
  const result = [];
  for (const conv of conversations) {
    const lastRows = await sql`
      SELECT id, content, sender_id, created_at, status, type
      FROM gechat_messages
      WHERE conversation_id = ${conv.id}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const lastMessage = lastRows[0]
      ? {
          id: lastRows[0].id,
          content: lastRows[0].content,
          senderId: lastRows[0].sender_id,
          createdAt: lastRows[0].created_at,
          status: lastRows[0].status,
          type: lastRows[0].type,
        }
      : null;
    const unreadCount = await getUnreadCount(conv.id, userId);
    result.push(mapConversation(conv, { lastMessage, unreadCount }));
  }
  return result;
}

export async function getUserConversations(userId) {
  const sql = getSql();
  const rows = await sql`
    SELECT c.*
    FROM gechat_conversations c
    JOIN gechat_conversation_members m ON m.conversation_id = c.id
    WHERE m.user_id = ${userId}
    ORDER BY c.updated_at DESC
  `;
  return attachLastMessageAndUnread(rows, userId);
}

export async function getConversationById(conversationId, userId) {
  const member = await isMember(conversationId, userId);
  if (!member) throw Object.assign(new Error('Acesso negado.'), { status: 403 });

  const sql = getSql();
  const rows = await sql`SELECT * FROM gechat_conversations WHERE id = ${conversationId} LIMIT 1`;
  if (!rows[0]) return null;
  const [conv] = await attachLastMessageAndUnread([rows[0]], userId);
  return conv;
}

async function addMembers(conversationId, memberIds, creatorId, creatorRole = 'admin') {
  const sql = getSql();
  const unique = [...new Set(memberIds.filter((id) => id && id !== creatorId))];
  await sql`
    INSERT INTO gechat_conversation_members (conversation_id, user_id, role)
    VALUES (${conversationId}, ${creatorId}, ${creatorRole})
    ON CONFLICT (conversation_id, user_id) DO NOTHING
  `;
  for (const memberId of unique) {
    await sql`
      INSERT INTO gechat_conversation_members (conversation_id, user_id, role)
      VALUES (${conversationId}, ${memberId}, 'member')
      ON CONFLICT (conversation_id, user_id) DO NOTHING
    `;
  }
}

export async function findDirectConversation(userA, userB) {
  const sql = getSql();
  const rows = await sql`
    SELECT c.*
    FROM gechat_conversations c
    WHERE c.type = 'direct'
      AND EXISTS (
        SELECT 1 FROM gechat_conversation_members m1
        WHERE m1.conversation_id = c.id AND m1.user_id = ${userA}
      )
      AND EXISTS (
        SELECT 1 FROM gechat_conversation_members m2
        WHERE m2.conversation_id = c.id AND m2.user_id = ${userB}
      )
      AND (
        SELECT COUNT(*) FROM gechat_conversation_members m
        WHERE m.conversation_id = c.id
      ) = 2
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function createDirectConversation(userId, targetUserId) {
  if (userId === targetUserId) {
    throw Object.assign(new Error('Não é possível criar conversa consigo mesmo.'), { status: 400 });
  }
  const existing = await findDirectConversation(userId, targetUserId);
  if (existing) {
    const [conv] = await attachLastMessageAndUnread([existing], userId);
    return conv;
  }

  const sql = getSql();
  const rows = await sql`
    INSERT INTO gechat_conversations (type, created_by)
    VALUES ('direct', ${userId})
    RETURNING *
  `;
  const conversation = rows[0];
  await sql`
    INSERT INTO gechat_conversation_members (conversation_id, user_id, role)
    VALUES (${conversation.id}, ${userId}, 'member'),
           (${conversation.id}, ${targetUserId}, 'member')
  `;
  const [conv] = await attachLastMessageAndUnread([conversation], userId);
  return conv;
}

export async function createGroup({ name, description, avatarUrl, memberIds, creatorId }) {
  if (!name?.trim()) throw Object.assign(new Error('Nome do grupo é obrigatório.'), { status: 400 });
  const sql = getSql();
  const rows = await sql`
    INSERT INTO gechat_conversations (type, name, description, avatar_url, created_by)
    VALUES (
      'group',
      ${name.trim()},
      ${description?.trim() || null},
      ${avatarUrl?.trim() || null},
      ${creatorId}
    )
    RETURNING *
  `;
  await addMembers(rows[0].id, memberIds ?? [], creatorId);
  const [conv] = await attachLastMessageAndUnread([rows[0]], creatorId);
  return conv;
}

export async function createChannel({ name, channelSubtype = 'geral', memberIds, creatorId }) {
  if (!name?.trim()) throw Object.assign(new Error('Nome do canal é obrigatório.'), { status: 400 });
  const validSubtypes = ['geral', 'setor', 'projeto', 'avisos'];
  if (!validSubtypes.includes(channelSubtype)) {
    throw Object.assign(new Error('Subtipo de canal inválido.'), { status: 400 });
  }
  const sql = getSql();
  const rows = await sql`
    INSERT INTO gechat_conversations (type, name, channel_subtype, created_by)
    VALUES ('channel', ${name.trim()}, ${channelSubtype}, ${creatorId})
    RETURNING *
  `;
  await addMembers(rows[0].id, memberIds ?? [], creatorId);
  const [conv] = await attachLastMessageAndUnread([rows[0]], creatorId);
  return conv;
}

export async function updateGroupName(conversationId, userId, name) {
  const role = await import('./membership.service.mjs').then((m) => m.getMemberRole(conversationId, userId));
  if (role !== 'admin') throw Object.assign(new Error('Apenas admin pode renomear.'), { status: 403 });
  const sql = getSql();
  const rows = await sql`
    UPDATE gechat_conversations SET name = ${name.trim()}, updated_at = NOW()
    WHERE id = ${conversationId} AND type IN ('group', 'channel')
    RETURNING *
  `;
  return rows[0] ? mapConversation(rows[0]) : null;
}

export async function updateGroupMembers(conversationId, userId, memberIds) {
  const role = await import('./membership.service.mjs').then((m) => m.getMemberRole(conversationId, userId));
  if (role !== 'admin') throw Object.assign(new Error('Apenas admin pode alterar membros.'), { status: 403 });
  const sql = getSql();
  const existing = await getConversationMembers(conversationId);
  const existingIds = new Set(existing.map((m) => m.user_id));
  const targetIds = new Set([...memberIds, userId]);
  for (const id of targetIds) {
    if (!existingIds.has(id)) {
      await sql`
        INSERT INTO gechat_conversation_members (conversation_id, user_id, role)
        VALUES (${conversationId}, ${id}, 'member')
        ON CONFLICT DO NOTHING
      `;
    }
  }
  return getConversationMembers(conversationId);
}
