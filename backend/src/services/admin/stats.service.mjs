import { getSql } from '../../db/neon.mjs';
import { getOnlineUserIds } from '../../realtime/presence-manager.mjs';
import { enrichProfiles } from '../gechat/profile-enrichment.service.mjs';

function toInt(value) {
  return Number(value ?? 0);
}

export async function getOverviewStats() {
  const sql = getSql();
  const onlineUserIds = getOnlineUserIds();

  const [convRows, msgToday, msgWeek, failedMsgs, restrictedGroups, active24h, active7d] =
    await Promise.all([
      sql`
        SELECT type, COUNT(*)::int AS count
        FROM gechat_conversations
        GROUP BY type
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM gechat_messages
        WHERE created_at >= date_trunc('day', NOW())
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM gechat_messages
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM gechat_messages
        WHERE status = 'failed'
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM gechat_conversations
        WHERE only_admins_can_send = TRUE
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM gechat_user_presence
        WHERE last_seen_at >= NOW() - INTERVAL '24 hours'
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM gechat_user_presence
        WHERE last_seen_at >= NOW() - INTERVAL '7 days'
      `,
    ]);

  const conversationsByType = { direct: 0, group: 0, channel: 0 };
  let conversationsTotal = 0;
  for (const row of convRows) {
    const type = row.type;
    const count = toInt(row.count);
    if (type in conversationsByType) conversationsByType[type] = count;
    conversationsTotal += count;
  }

  return {
    onlineNow: onlineUserIds.length,
    activeUsers24h: toInt(active24h[0]?.count),
    activeUsers7d: toInt(active7d[0]?.count),
    conversationsTotal,
    conversationsByType,
    messagesToday: toInt(msgToday[0]?.count),
    messages7d: toInt(msgWeek[0]?.count),
    failedMessages: toInt(failedMsgs[0]?.count),
    restrictedGroups: toInt(restrictedGroups[0]?.count),
  };
}

export async function getMessageActivity(days = 7) {
  const safeDays = Math.min(Math.max(Number(days) || 7, 1), 30);
  const sql = getSql();

  const rows = await sql`
    SELECT DATE(created_at) AS date, COUNT(*)::int AS count
    FROM gechat_messages
    WHERE created_at >= NOW() - (${safeDays} * INTERVAL '1 day')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  const countByDate = new Map(
    rows.map((row) => {
      const raw = row.date;
      const key =
        raw instanceof Date
          ? raw.toISOString().slice(0, 10)
          : String(raw).slice(0, 10);
      return [key, toInt(row.count)];
    }),
  );

  const series = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = safeDays - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    series.push({
      date: label,
      messages: countByDate.get(key) ?? 0,
    });
  }

  return { days: safeDays, series };
}

export async function getConversationsOverview(limit = 50, appLocals = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const sql = getSql();

  const rows = await sql`
    SELECT
      c.id,
      c.type,
      c.name,
      c.channel_subtype,
      c.only_admins_can_send,
      c.created_at,
      COUNT(DISTINCT m.user_id)::int AS member_count,
      MAX(msg.created_at) AS last_message_at
    FROM gechat_conversations c
    LEFT JOIN gechat_conversation_members m ON m.conversation_id = c.id
    LEFT JOIN gechat_messages msg ON msg.conversation_id = c.id
    GROUP BY c.id
    ORDER BY last_message_at DESC NULLS LAST, c.created_at DESC
    LIMIT ${safeLimit}
  `;

  if (!rows.length) return [];

  const convIds = rows.map((row) => row.id);
  const memberRows = await sql`
    SELECT conversation_id, user_id
    FROM gechat_conversation_members
    WHERE conversation_id = ANY(${convIds}::uuid[])
    ORDER BY joined_at ASC
  `;

  const memberIdsByConv = {};
  const allUserIds = new Set();
  for (const row of memberRows) {
    const convId = row.conversation_id;
    if (!memberIdsByConv[convId]) memberIdsByConv[convId] = [];
    memberIdsByConv[convId].push(String(row.user_id));
    allUserIds.add(String(row.user_id));
  }

  const profileMap = await enrichProfiles(
    appLocals.supabaseUrl,
    appLocals.supabaseServiceRoleKey,
    [...allUserIds],
  );

  return rows.map((row) => {
    const memberIds = memberIdsByConv[row.id] ?? [];
    const members = memberIds.map((id) => ({
      id,
      name: profileMap[id]?.name ?? 'Usuário',
    }));

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

    return {
      id: row.id,
      type: row.type,
      name: row.name,
      channelSubtype: row.channel_subtype,
      onlyAdminsCanSend: Boolean(row.only_admins_can_send),
      memberCount: toInt(row.member_count),
      members,
      memberNames: members.map((m) => m.name).join(', '),
      createdAt: row.created_at,
      lastMessageAt: row.last_message_at,
      displayName,
    };
  });
}

export async function pingNeon() {
  const sql = getSql();
  await sql`SELECT 1 AS ok`;
  return true;
}
