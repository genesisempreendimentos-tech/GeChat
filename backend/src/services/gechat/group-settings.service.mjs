import { getSql } from '../../db/neon.mjs';
import { getMemberRole, isMember } from './membership.service.mjs';

const MAX_DESCRIPTION = 500;

async function requireGroup(conversationId) {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM gechat_conversations
    WHERE id = ${conversationId} AND type = 'group'
    LIMIT 1
  `;
  if (!rows[0]) {
    throw Object.assign(new Error('Grupo não encontrado.'), { status: 404 });
  }
  return rows[0];
}

async function requireAdmin(conversationId, userId) {
  const role = await getMemberRole(conversationId, userId);
  if (role !== 'admin') {
    throw Object.assign(new Error('Apenas administradores podem fazer esta alteração.'), { status: 403 });
  }
}

function mapGroupConversation(row) {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description ?? null,
    avatar: row.avatar_url ?? undefined,
    onlyAdminsCanEdit: Boolean(row.only_admins_can_edit),
    onlyAdminsCanSend: Boolean(row.only_admins_can_send),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getGroupSettings(conversationId, userId) {
  const sql = getSql();
  const rows = await sql`
    SELECT
      c.*,
      m.role,
      m.muted,
      m.notifications_enabled
    FROM gechat_conversations c
    INNER JOIN gechat_conversation_members m
      ON m.conversation_id = c.id AND m.user_id = ${userId}
    WHERE c.id = ${conversationId} AND c.type = 'group'
    LIMIT 1
  `;

  if (!rows[0]) {
    const member = await isMember(conversationId, userId);
    if (!member) {
      throw Object.assign(new Error('Acesso negado.'), { status: 403 });
    }
    throw Object.assign(new Error('Grupo não encontrado.'), { status: 404 });
  }

  const row = rows[0];
  const members = await import('./membership.service.mjs').then((m) =>
    m.getConversationMembers(conversationId),
  );

  return {
    conversation: mapGroupConversation(row),
    mySettings: {
      role: row.role,
      muted: Boolean(row.muted),
      notificationsEnabled: Boolean(row.notifications_enabled),
    },
    members,
  };
}

export async function updateGroupDetails(conversationId, userId, patch) {
  if (!(await isMember(conversationId, userId))) {
    throw Object.assign(new Error('Acesso negado.'), { status: 403 });
  }
  const conversation = await requireGroup(conversationId);
  if (conversation.only_admins_can_edit) {
    await requireAdmin(conversationId, userId);
  }

  const sql = getSql();
  const current = await sql`
    SELECT * FROM gechat_conversations WHERE id = ${conversationId} LIMIT 1
  `;
  const row = current[0];
  const name = patch.name !== undefined ? String(patch.name).trim() : row.name;
  const description =
    patch.description !== undefined
      ? String(patch.description).trim().slice(0, MAX_DESCRIPTION) || null
      : row.description;
  const avatarUrl =
    patch.avatarUrl !== undefined
      ? String(patch.avatarUrl).trim() || null
      : row.avatar_url;
  if (patch.onlyAdminsCanEdit !== undefined || patch.onlyAdminsCanSend !== undefined) {
    await requireAdmin(conversationId, userId);
  }

  const onlyAdminsCanEdit =
    patch.onlyAdminsCanEdit !== undefined
      ? Boolean(patch.onlyAdminsCanEdit)
      : Boolean(row.only_admins_can_edit);
  const onlyAdminsCanSend =
    patch.onlyAdminsCanSend !== undefined
      ? Boolean(patch.onlyAdminsCanSend)
      : Boolean(row.only_admins_can_send);

  if (!name) {
    throw Object.assign(new Error('Nome do grupo é obrigatório.'), { status: 400 });
  }

  const updated = await sql`
    UPDATE gechat_conversations
    SET
      name = ${name},
      description = ${description},
      avatar_url = ${avatarUrl},
      only_admins_can_edit = ${onlyAdminsCanEdit},
      only_admins_can_send = ${onlyAdminsCanSend},
      updated_at = NOW()
    WHERE id = ${conversationId}
    RETURNING *
  `;

  return mapGroupConversation(updated[0]);
}

export async function updateMemberSettings(conversationId, userId, patch) {
  if (!(await isMember(conversationId, userId))) {
    throw Object.assign(new Error('Acesso negado.'), { status: 403 });
  }
  await requireGroup(conversationId);

  const sql = getSql();
  const current = await sql`
    SELECT muted, notifications_enabled
    FROM gechat_conversation_members
    WHERE conversation_id = ${conversationId} AND user_id = ${userId}
    LIMIT 1
  `;
  if (!current[0]) {
    throw Object.assign(new Error('Membro não encontrado.'), { status: 404 });
  }

  let muted = Boolean(current[0].muted);
  let notificationsEnabled = Boolean(current[0].notifications_enabled);

  if (patch.muted !== undefined) {
    muted = Boolean(patch.muted);
    if (muted) notificationsEnabled = false;
  }
  if (patch.notificationsEnabled !== undefined) {
    notificationsEnabled = Boolean(patch.notificationsEnabled);
    if (notificationsEnabled) muted = false;
  }

  const updated = await sql`
    UPDATE gechat_conversation_members
    SET muted = ${muted}, notifications_enabled = ${notificationsEnabled}
    WHERE conversation_id = ${conversationId} AND user_id = ${userId}
    RETURNING role, muted, notifications_enabled
  `;

  const member = updated[0];
  return {
    role: member.role,
    muted: Boolean(member.muted),
    notificationsEnabled: Boolean(member.notifications_enabled),
  };
}

export async function addGroupMembers(conversationId, userId, memberIds) {
  if (!(await isMember(conversationId, userId))) {
    throw Object.assign(new Error('Acesso negado.'), { status: 403 });
  }
  await requireGroup(conversationId);
  await requireAdmin(conversationId, userId);

  const sql = getSql();
  const unique = [...new Set((memberIds ?? []).filter((id) => id && id !== userId))];
  for (const memberId of unique) {
    await sql`
      INSERT INTO gechat_conversation_members (conversation_id, user_id, role)
      VALUES (${conversationId}, ${memberId}, 'member')
      ON CONFLICT (conversation_id, user_id) DO NOTHING
    `;
  }

  return unique;
}
