import { createClient } from '@supabase/supabase-js';
import { getSql } from '../../db/neon.mjs';
import { getOnlineUserIds } from '../../realtime/presence-manager.mjs';

function profileToUser(row) {
  const id = String(row.user_id ?? row.id ?? '');
  const accessType = String(row.access_type ?? row.accessType ?? 'user').toLowerCase() === 'admin' ? 'admin' : 'user';
  return {
    id,
    name: String(row.name ?? row.email?.split('@')[0] ?? 'Usuário'),
    email: row.email ?? null,
    avatar: row.avatar_url ?? row.avatar ?? null,
    accessType,
    profileStatus: row.profile_status ?? row.profileStatus ?? 'active',
    createdAt: row.created_at ?? null,
  };
}

export async function listAdminUsers(appLocals) {
  const { supabaseUrl, supabaseServiceRoleKey } = appLocals;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Service role não configurada.');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'user_id, id, full_name, name, email, avatar_url, avatar, profile_status, access_type, apelido, created_at',
    )
    .order('full_name', { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);

  const users = (data ?? [])
    .map(profileToUser)
    .filter((user) => user.id);

  const userIds = users.map((u) => u.id);
  const onlineSet = new Set(getOnlineUserIds());

  let presenceMap = new Map();
  if (userIds.length > 0) {
    const sql = getSql();
    const presenceRows = await sql`
      SELECT user_id, last_seen_at
      FROM gechat_user_presence
      WHERE user_id = ANY(${userIds}::uuid[])
    `;
    presenceMap = new Map(
      presenceRows.map((row) => [String(row.user_id), row.last_seen_at]),
    );
  }

  const enriched = users.map((user) => ({
    ...user,
    online: onlineSet.has(user.id),
    lastSeenAt: presenceMap.get(user.id) ?? null,
  }));

  enriched.sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    const aTime = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
    const bTime = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
    return bTime - aTime;
  });

  return enriched;
}
