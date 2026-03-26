/**
 * GêTeams / Neon:
 * - Dados corporativos (RH): `company_profile.ge_teams_workspace` comparado a `collaborators.workspace_name` (ver getCollaboratorByCorporateEmail em index.mjs).
 * - Outras rotas (equipes, setores, etc.): nome no Supabase → id em `public.workspaces` → filtro em `collaborators.workspace_id`.
 */
import { createClient } from '@supabase/supabase-js';

/**
 * @typedef {'none' | 'filter' | 'configured_not_found'} GeTeamsWorkspaceFilterMode
 */

/**
 * Lê o nome do workspace configurado no painel Empresa (Supabase).
 * @returns {Promise<string|null>} null se vazio ou erro (RLS / rede).
 */
export async function fetchCompanyGeTeamsWorkspaceName(supabaseUrl, supabaseAnonKey, accessToken) {
  const ctx = await fetchCompanyGeTeamsWorkspaceContext(supabaseUrl, supabaseAnonKey, accessToken);
  return ctx.name;
}

/**
 * Nome + id do workspace no Neon (coluna opcional geteams_workspace_id no Supabase).
 * @returns {Promise<{ name: string | null, workspaceId: string | null }>}
 */
export async function fetchCompanyGeTeamsWorkspaceContext(supabaseUrl, supabaseAnonKey, accessToken) {
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    return { name: null, workspaceId: null };
  }
  try {
    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    let data;
    let error;
    ({ data, error } = await sb
      .from('company_profile')
      .select('ge_teams_workspace, geteams_workspace_id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle());
    if (error) {
      ({ data, error } = await sb
        .from('company_profile')
        .select('ge_teams_workspace')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle());
    }
    if (error || !data) return { name: null, workspaceId: null };
    const w = data.ge_teams_workspace;
    const name = w != null && String(w).trim() ? String(w).trim() : null;
    const rawId = data.geteams_workspace_id;
    const workspaceId =
      rawId != null && String(rawId).trim() ? String(rawId).trim() : null;
    return { name, workspaceId };
  } catch {
    return { name: null, workspaceId: null };
  }
}

/**
 * Resolve o id do workspace no Neon pelo nome (case-insensitive, trim).
 * @returns {Promise<string|null>}
 */
export async function resolveNeonWorkspaceIdByName(pgClient, workspaceName) {
  const name = String(workspaceName ?? '').trim();
  if (!name) return null;
  const attempts = [
    `SELECT id::text AS id FROM public.workspaces
     WHERE status = 'active' AND deleted_at IS NULL
       AND LOWER(TRIM(name)) = LOWER(TRIM($1))
     LIMIT 1`,
    `SELECT id::text AS id FROM public.workspaces
     WHERE status = 'active'
       AND LOWER(TRIM(name)) = LOWER(TRIM($1))
     LIMIT 1`,
    `SELECT id::text AS id FROM public.workspaces
     WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
     LIMIT 1`,
    `SELECT id::text AS id FROM public.workspaces
     WHERE deleted_at IS NULL
       AND LOWER(TRIM(name)) = LOWER(TRIM($1))
     LIMIT 1`,
  ];
  for (const sql of attempts) {
    try {
      const res = await pgClient.query(sql, [name]);
      const id = res.rows[0]?.id;
      if (id) return String(id);
    } catch (e) {
      if (e.code !== '42703' && e.code !== '42P01') throw e;
    }
  }
  return null;
}

/**
 * @returns {Promise<{ mode: GeTeamsWorkspaceFilterMode, workspaceId: string | null }>}
 */
export async function resolveNeonWorkspaceFilter(supabaseUrl, supabaseAnonKey, accessToken, pgClient) {
  const name = await fetchCompanyGeTeamsWorkspaceName(supabaseUrl, supabaseAnonKey, accessToken);
  if (!name) {
    return { mode: 'none', workspaceId: null };
  }
  const id = await resolveNeonWorkspaceIdByName(pgClient, name);
  if (!id) {
    return { mode: 'configured_not_found', workspaceId: null };
  }
  return { mode: 'filter', workspaceId: id };
}
