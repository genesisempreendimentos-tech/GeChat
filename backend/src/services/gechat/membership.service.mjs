import { getSql } from '../../db/neon.mjs';

export async function isMember(conversationId, userId) {
  const sql = getSql();
  const rows = await sql`
    SELECT 1 FROM gechat_conversation_members
    WHERE conversation_id = ${conversationId} AND user_id = ${userId}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function getMemberRole(conversationId, userId) {
  const sql = getSql();
  const rows = await sql`
    SELECT role FROM gechat_conversation_members
    WHERE conversation_id = ${conversationId} AND user_id = ${userId}
    LIMIT 1
  `;
  return rows[0]?.role ?? null;
}

export async function getConversationMembers(conversationId) {
  const sql = getSql();
  return sql`
    SELECT id, conversation_id, user_id, role, last_read_at, joined_at
    FROM gechat_conversation_members
    WHERE conversation_id = ${conversationId}
    ORDER BY joined_at ASC
  `;
}

export async function getUserConversationIds(userId) {
  const sql = getSql();
  const rows = await sql`
    SELECT conversation_id FROM gechat_conversation_members
    WHERE user_id = ${userId}
  `;
  return rows.map((r) => r.conversation_id);
}

export async function canPostInConversation(conversationId, userId) {
  const sql = getSql();
  const rows = await sql`
    SELECT c.type, c.channel_subtype, c.only_admins_can_send, m.role
    FROM gechat_conversations c
    JOIN gechat_conversation_members m ON m.conversation_id = c.id
    WHERE c.id = ${conversationId} AND m.user_id = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return false;
  if (row.type === 'channel' && row.channel_subtype === 'avisos') {
    return row.role === 'admin';
  }
  if (row.type === 'group' && row.only_admins_can_send) {
    return row.role === 'admin';
  }
  return true;
}
