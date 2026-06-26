import { getSql } from '../../db/neon.mjs';
import { isMember } from './membership.service.mjs';
import { getMessageById } from './message.service.mjs';

function mapReaction(row) {
  return {
    userId: row.user_id,
    emoji: row.emoji,
    createdAt: row.created_at,
  };
}

export async function getReactionsForMessages(messageIds) {
  if (!messageIds?.length) return {};
  const sql = getSql();
  const rows = await sql`
    SELECT message_id, user_id, emoji, created_at
    FROM gechat_message_reactions
    WHERE message_id = ANY(${messageIds}::uuid[])
    ORDER BY created_at ASC
  `;

  const map = {};
  for (const row of rows) {
    const key = row.message_id;
    if (!map[key]) map[key] = [];
    map[key].push(mapReaction(row));
  }
  return map;
}

export async function getReactionsForMessage(messageId) {
  const sql = getSql();
  const rows = await sql`
    SELECT user_id, emoji, created_at
    FROM gechat_message_reactions
    WHERE message_id = ${messageId}
    ORDER BY created_at ASC
  `;
  return rows.map(mapReaction);
}

export async function toggleReaction(messageId, userId, emoji) {
  const trimmed = String(emoji ?? '').trim();
  if (!trimmed) throw Object.assign(new Error('Emoji inválido.'), { status: 400 });

  const message = await getMessageById(messageId);
  if (!message) throw Object.assign(new Error('Mensagem não encontrada.'), { status: 404 });

  const member = await isMember(message.conversationId, userId);
  if (!member) throw Object.assign(new Error('Acesso negado.'), { status: 403 });

  const sql = getSql();
  const existing = await sql`
    SELECT * FROM gechat_message_reactions
    WHERE message_id = ${messageId} AND user_id = ${userId}
    LIMIT 1
  `;

  if (existing[0]?.emoji === trimmed) {
    await sql`
      DELETE FROM gechat_message_reactions
      WHERE message_id = ${messageId} AND user_id = ${userId}
    `;
  } else if (existing[0]) {
    await sql`
      UPDATE gechat_message_reactions
      SET emoji = ${trimmed}, created_at = NOW()
      WHERE message_id = ${messageId} AND user_id = ${userId}
    `;
  } else {
    await sql`
      INSERT INTO gechat_message_reactions (message_id, user_id, emoji)
      VALUES (${messageId}, ${userId}, ${trimmed})
    `;
  }

  const reactions = await getReactionsForMessage(messageId);
  return {
    messageId,
    conversationId: message.conversationId,
    reactions,
  };
}
