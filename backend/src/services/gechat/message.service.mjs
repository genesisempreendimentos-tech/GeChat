import { getSql } from '../../db/neon.mjs';
import { isMember } from './membership.service.mjs';
import { getReactionsForMessages } from './reaction.service.mjs';
import { getUserPrivacy } from './privacy.service.mjs';

const DEFAULT_LIMIT = 50;

function mapMessage(row) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    type: row.type,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    editedAt: row.edited_at ?? null,
  };
}

export async function createMessage({ conversationId, senderId, content, type = 'text' }) {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO gechat_messages (conversation_id, sender_id, content, type, status)
    VALUES (${conversationId}, ${senderId}, ${content}, ${type}, 'sent')
    RETURNING *
  `;
  await sql`
    UPDATE gechat_conversations SET updated_at = NOW() WHERE id = ${conversationId}
  `;
  return mapMessage(rows[0]);
}

export async function updateMessageStatus(messageId, status) {
  const sql = getSql();
  const rows = await sql`
    UPDATE gechat_messages SET status = ${status}, updated_at = NOW()
    WHERE id = ${messageId}
    RETURNING *
  `;
  return rows[0] ? mapMessage(rows[0]) : null;
}

export async function getConversationMessages(conversationId, userId, { cursor, limit = DEFAULT_LIMIT } = {}) {
  const member = await isMember(conversationId, userId);
  if (!member) throw Object.assign(new Error('Acesso negado.'), { status: 403 });

  const sql = getSql();
  const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), 100);

  let rows;
  if (cursor) {
    const [cursorDate, cursorId] = cursor.split('|');
    rows = await sql`
      SELECT * FROM gechat_messages
      WHERE conversation_id = ${conversationId}
        AND (created_at, id) < (${cursorDate}::timestamptz, ${cursorId}::uuid)
      ORDER BY created_at DESC, id DESC
      LIMIT ${safeLimit}
    `;
  } else {
    rows = await sql`
      SELECT * FROM gechat_messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at DESC, id DESC
      LIMIT ${safeLimit}
    `;
  }

  const messages = rows.reverse().map(mapMessage);
  const reactionMap = await getReactionsForMessages(messages.map((m) => m.id));
  const messagesWithReactions = messages.map((m) => ({
    ...m,
    reactions: reactionMap[m.id] ?? [],
  }));
  await recordPendingDeliveries(conversationId, userId);
  const nextCursor =
    rows.length === safeLimit && messages.length > 0
      ? `${messages[0].createdAt instanceof Date ? messages[0].createdAt.toISOString() : messages[0].createdAt}|${messages[0].id}`
      : null;

  return { messages: messagesWithReactions, nextCursor };
}

export async function markConversationAsRead(conversationId, userId) {
  const member = await isMember(conversationId, userId);
  if (!member) throw Object.assign(new Error('Acesso negado.'), { status: 403 });

  const sql = getSql();
  const now = new Date().toISOString();
  const privacy = await getUserPrivacy(userId);

  await sql`
    UPDATE gechat_conversation_members
    SET last_read_at = ${now}
    WHERE conversation_id = ${conversationId} AND user_id = ${userId}
  `;

  if (!privacy.readReceiptsEnabled) {
    return { readCount: 0, readAt: now, receiptsSent: false };
  }

  await recordPendingDeliveries(conversationId, userId);

  const unread = await sql`
    SELECT id FROM gechat_messages
    WHERE conversation_id = ${conversationId}
      AND sender_id != ${userId}
      AND id NOT IN (
        SELECT message_id FROM gechat_message_reads WHERE user_id = ${userId}
      )
  `;

  for (const msg of unread) {
    await sql`
      INSERT INTO gechat_message_reads (message_id, user_id, read_at)
      VALUES (${msg.id}, ${userId}, ${now})
      ON CONFLICT (message_id, user_id) DO NOTHING
    `;
  }

  await sql`
    UPDATE gechat_messages SET status = 'read', updated_at = NOW()
    WHERE conversation_id = ${conversationId}
      AND sender_id != ${userId}
      AND status IN ('sent', 'delivered')
  `;

  return { readCount: unread.length, readAt: now, receiptsSent: true };
}

export async function getUnreadCount(conversationId, userId) {
  const sql = getSql();
  const memberRows = await sql`
    SELECT last_read_at FROM gechat_conversation_members
    WHERE conversation_id = ${conversationId} AND user_id = ${userId}
    LIMIT 1
  `;
  const lastRead = memberRows[0]?.last_read_at;

  if (!lastRead) {
    const rows = await sql`
      SELECT COUNT(*)::int AS count FROM gechat_messages
      WHERE conversation_id = ${conversationId} AND sender_id != ${userId}
    `;
    return rows[0]?.count ?? 0;
  }

  const rows = await sql`
    SELECT COUNT(*)::int AS count FROM gechat_messages
    WHERE conversation_id = ${conversationId}
      AND sender_id != ${userId}
      AND created_at > ${lastRead}
  `;
  return rows[0]?.count ?? 0;
}

export async function getMessageById(messageId) {
  const sql = getSql();
  const rows = await sql`SELECT * FROM gechat_messages WHERE id = ${messageId} LIMIT 1`;
  return rows[0] ? mapMessage(rows[0]) : null;
}

export async function editMessage(messageId, userId, content) {
  const trimmed = String(content ?? '').trim();
  if (!trimmed) throw Object.assign(new Error('Conteúdo vazio.'), { status: 400 });

  const sql = getSql();
  const existing = await sql`
    SELECT * FROM gechat_messages WHERE id = ${messageId} LIMIT 1
  `;
  const row = existing[0];
  if (!row) throw Object.assign(new Error('Mensagem não encontrada.'), { status: 404 });
  if (row.sender_id !== userId) {
    throw Object.assign(new Error('Sem permissão para editar.'), { status: 403 });
  }
  if (row.type !== 'text') {
    throw Object.assign(new Error('Só mensagens de texto podem ser editadas.'), { status: 400 });
  }

  const member = await isMember(row.conversation_id, userId);
  if (!member) throw Object.assign(new Error('Acesso negado.'), { status: 403 });

  const updated = await sql`
    UPDATE gechat_messages
    SET content = ${trimmed}, edited_at = NOW(), updated_at = NOW()
    WHERE id = ${messageId}
    RETURNING *
  `;

  await sql`
    UPDATE gechat_conversations SET updated_at = NOW() WHERE id = ${row.conversation_id}
  `;

  return mapMessage(updated[0]);
}

export async function recordMessageDelivery(messageId, userId) {
  const sql = getSql();
  const now = new Date().toISOString();
  await sql`
    INSERT INTO gechat_message_deliveries (message_id, user_id, delivered_at)
    VALUES (${messageId}, ${userId}, ${now})
    ON CONFLICT (message_id, user_id) DO NOTHING
  `;
}

export async function recordDeliveriesForOnlineMembers(messageId, conversationId, senderId) {
  const { getConversationMembers } = await import('./membership.service.mjs');
  const { isUserOnline } = await import('../../realtime/presence-manager.mjs');
  const members = await getConversationMembers(conversationId);

  for (const member of members) {
    if (member.user_id === senderId) continue;
    if (isUserOnline(member.user_id)) {
      await recordMessageDelivery(messageId, member.user_id);
    }
  }
}

export async function recordPendingDeliveries(conversationId, userId) {
  const sql = getSql();
  const now = new Date().toISOString();
  const result = await sql`
    INSERT INTO gechat_message_deliveries (message_id, user_id, delivered_at)
    SELECT m.id, ${userId}, ${now}
    FROM gechat_messages m
    WHERE m.conversation_id = ${conversationId}
      AND m.sender_id != ${userId}
      AND NOT EXISTS (
        SELECT 1 FROM gechat_message_deliveries d
        WHERE d.message_id = m.id AND d.user_id = ${userId}
      )
    ON CONFLICT (message_id, user_id) DO NOTHING
    RETURNING message_id
  `;
  return result.length;
}

export async function getMessageReceiptDetails(messageId, conversationId, userId) {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM gechat_messages WHERE id = ${messageId} LIMIT 1
  `;
  const row = rows[0];
  if (!row) throw Object.assign(new Error('Mensagem não encontrada.'), { status: 404 });
  if (row.conversation_id !== conversationId) {
    throw Object.assign(new Error('Mensagem não pertence a esta conversa.'), { status: 400 });
  }

  const member = await isMember(conversationId, userId);
  if (!member) throw Object.assign(new Error('Acesso negado.'), { status: 403 });
  if (row.sender_id !== userId) {
    throw Object.assign(new Error('Somente o autor pode ver os dados da mensagem.'), { status: 403 });
  }

  const deliveries = await sql`
    SELECT user_id, delivered_at
    FROM gechat_message_deliveries
    WHERE message_id = ${messageId}
    ORDER BY delivered_at ASC
  `;

  const reads = await sql`
    SELECT user_id, read_at
    FROM gechat_message_reads
    WHERE message_id = ${messageId}
    ORDER BY read_at ASC
  `;

  const readUserIds = new Set(reads.map((r) => r.user_id));

  return {
    deliveredTo: deliveries
      .filter((r) => !readUserIds.has(r.user_id))
      .map((r) => ({
        userId: r.user_id,
        at: r.delivered_at instanceof Date ? r.delivered_at.toISOString() : r.delivered_at,
      })),
    readBy: reads.map((r) => ({
      userId: r.user_id,
      at: r.read_at instanceof Date ? r.read_at.toISOString() : r.read_at,
    })),
  };
}

export async function getMessageReadReceipts(messageId, conversationId, userId) {
  const details = await getMessageReceiptDetails(messageId, conversationId, userId);
  return details.readBy.map((r) => ({ userId: r.userId, readAt: r.at }));
}

export async function deleteMessage(messageId, userId) {
  const sql = getSql();
  const rows = await sql`SELECT * FROM gechat_messages WHERE id = ${messageId} LIMIT 1`;
  const row = rows[0];
  if (!row) throw Object.assign(new Error('Mensagem não encontrada.'), { status: 404 });
  if (row.sender_id !== userId) {
    throw Object.assign(new Error('Sem permissão para excluir.'), { status: 403 });
  }

  const member = await isMember(row.conversation_id, userId);
  if (!member) throw Object.assign(new Error('Acesso negado.'), { status: 403 });

  await sql`DELETE FROM gechat_messages WHERE id = ${messageId}`;
  await sql`
    UPDATE gechat_conversations SET updated_at = NOW() WHERE id = ${row.conversation_id}
  `;

  return {
    messageId,
    conversationId: row.conversation_id,
  };
}
