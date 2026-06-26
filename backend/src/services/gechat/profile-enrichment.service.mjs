import { createClient } from '@supabase/supabase-js';

function createServiceClient(supabaseUrl, serviceRoleKey) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapProfile(row) {
  const name =
    row.full_name ?? row.name ?? row.nome ?? row.display_name ?? row.email?.split('@')[0] ?? 'Usuário';
  return {
    id: String(row.user_id ?? row.id),
    name: String(name),
    email: String(row.email ?? ''),
    avatar: row.avatar_url ?? row.avatar ?? undefined,
  };
}

export async function enrichProfiles(supabaseUrl, serviceRoleKey, userIds) {
  if (!userIds.length || !supabaseUrl || !serviceRoleKey) {
    return Object.fromEntries(userIds.map((id) => [id, { id, name: 'Usuário', email: '', avatar: undefined }]));
  }

  const supabase = createServiceClient(supabaseUrl, serviceRoleKey);
  const uniqueIds = [...new Set(userIds)];
  const map = {};

  for (const id of uniqueIds) {
    map[id] = { id, name: 'Usuário', email: '', avatar: undefined };
  }

  try {
    const { data, error } = await supabase.from('profiles').select('*').in('user_id', uniqueIds);
    if (!error && data?.length) {
      for (const row of data) {
        const p = mapProfile(row);
        map[p.id] = p;
      }
    }
    const missing = uniqueIds.filter((id) => map[id].name === 'Usuário');
    if (missing.length) {
      const { data: byId } = await supabase.from('profiles').select('*').in('id', missing);
      for (const row of byId ?? []) {
        const p = mapProfile(row);
        map[p.id] = p;
      }
    }
  } catch (err) {
    console.error('[gechat] enrichProfiles:', err?.message ?? err);
  }

  return map;
}

export function enrichConversationsWithProfiles(conversations, profileMap, currentUserId) {
  return conversations.map((conv) => {
    if (conv.type === 'direct') {
      const otherMemberId = conv.otherMemberId;
      const profile = otherMemberId ? profileMap[otherMemberId] : null;
      return {
        ...conv,
        displayName: profile?.name ?? 'Conversa',
        avatar: profile?.avatar,
        otherMember: profile,
      };
    }
    return {
      ...conv,
      displayName: conv.name ?? 'Grupo',
      avatar: undefined,
    };
  });
}
