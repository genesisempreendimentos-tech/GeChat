import { getSql } from '../../db/neon.mjs';
import { getConversationMembers } from '../gechat/membership.service.mjs';
import { enrichProfiles } from '../gechat/profile-enrichment.service.mjs';
import { getReactionsForMessages } from '../gechat/reaction.service.mjs';

const DEFAULT_LIMIT = 50;

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

export async function getAdminConversationDetail(conversationId, appLocals) {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM gechat_conversations WHERE id = ${conversationId} LIMIT 1
  `;
  if (!rows[0]) {
    throw Object.assign(new Error('Conversa não encontrada.'), { status: 404 });
  }

  const row = rows[0];
  const memberRows = await getConversationMembers(conversationId);
  const memberIds = memberRows.map((m) => String(m.user_id));
  const profileMap = await enrichProfiles(
    appLocals.supabaseUrl,
    appLocals.supabaseServiceRoleKey,
    memberIds,
  );

  const members = memberRows.map((m) => {
    const id = String(m.user_id);
    const profile = profileMap[id];
    return {
      id,
      name: profile?.name ?? 'Usuário',
      avatar: profile?.avatar ?? null,
      role: m.role,
    };
  });

  let displayName = row.name;
  if (!displayName) {
    if (row.type === 'direct') {
      displayName = members.map((m) => m.name).join(' · ') || 'Conversa direta';
    } else if (row.type === 'channel') {
      displayName = 'Canal';
    } else {
      displayName = 'Grupo';
    }
  }

  const otherMemberId =
    row.type === 'direct' ? members[0]?.id ?? members[1]?.id ?? null : null;
  const otherMember =
    row.type === 'direct' && otherMemberId
      ? { id: otherMemberId, name: profileMap[otherMemberId]?.name ?? 'Usuário', avatar: profileMap[otherMemberId]?.avatar }
      : undefined;

  const conversation = mapConversation(row, {
    displayName,
    otherMemberId,
    otherMember,
    memberIds,
  });

  return { conversation, members };
}

export async function getAdminConversationMessages(conversationId, { cursor, limit = DEFAULT_LIMIT } = {}) {
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

  const nextCursor =
    rows.length === safeLimit && messages.length > 0
      ? `${messages[0].createdAt instanceof Date ? messages[0].createdAt.toISOString() : messages[0].createdAt}|${messages[0].id}`
      : null;

  return { messages: messagesWithReactions, nextCursor };
}
