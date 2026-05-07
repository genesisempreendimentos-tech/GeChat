import { createClient } from '@supabase/supabase-js';

export function createSupabaseAnonClient(supabaseUrl, supabaseAnonKey, accessToken = null) {
  const options = accessToken
    ? {
        global: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      }
    : undefined;
  return createClient(supabaseUrl, supabaseAnonKey, options);
}

export function normalizeRole(value) {
  return value === 'admin' || value === 'creator' || value === 'user' ? value : 'user';
}

export function profileRecordToUser(row, fallback) {
  const name =
    row.full_name ??
    row.name ??
    row.nome ??
    row.display_name ??
    fallback.email?.split('@')[0] ??
    'Usuário';
  const accessType = String(row.access_type ?? row.accessType ?? row.role ?? 'user');
  return {
    id: String(row.user_id ?? row.id ?? fallback.id),
    name: String(name),
    full_name: String(name),
    email: String(row.email ?? fallback.email ?? ''),
    role: normalizeRole(accessType),
    accessType,
    profileStatus: row.profile_status ?? row.profileStatus ?? 'active',
    avatar: row.avatar_url ?? row.avatar ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    sidebar: row.sidebar,
    banner_url: row.banner_url ?? null,
    profession: row.profession ?? null,
    birth_date: row.birth_date ?? null,
    hire_date: row.hire_date ?? null,
  };
}

export function authUserToProfile(authUser) {
  const meta = authUser.user_metadata ?? {};
  const name = meta.full_name ?? meta.name ?? authUser.email?.split('@')[0] ?? 'Usuário';
  const accessType = String(meta.access_type ?? meta.role ?? 'user');
  return {
    id: authUser.id,
    name: String(name),
    full_name: String(name),
    email: String(authUser.email ?? ''),
    role: normalizeRole(accessType),
    accessType,
    profileStatus: 'active',
    avatar: meta.avatar_url ?? meta.avatar ?? undefined,
    createdAt: new Date().toISOString(),
  };
}

export async function loadProfileForAuthUser(supabaseUrl, supabaseAnonKey, accessToken, authUser) {
  const supabase = createSupabaseAnonClient(supabaseUrl, supabaseAnonKey, accessToken);
  for (const key of ['user_id', 'id']) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq(key, authUser.id)
      .maybeSingle();
    if (data) return profileRecordToUser(data, authUser);
    if (error && error.code !== '42703' && error.code !== 'PGRST116') break;
  }
  if (authUser.email) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', authUser.email)
      .maybeSingle();
    if (data) return profileRecordToUser(data, authUser);
  }
  return authUserToProfile(authUser);
}
