-- Equipes: escopo por workspace GêTeams (paridade com request_channels / company_profile).
-- Execute no SQL Editor do Supabase.

alter table public.teams
  add column if not exists workspace_id text;

alter table public.teams
  add column if not exists workspace_name text;

comment on column public.teams.workspace_id is
  'Id do workspace no Neon (public.workspaces); alinha a company_profile.geteams_workspace_id.';

comment on column public.teams.workspace_name is
  'Nome do workspace no GêTeams no cadastro; alinha a company_profile.ge_teams_workspace.';

create index if not exists idx_teams_workspace_id on public.teams (workspace_id);

create index if not exists idx_teams_workspace_name_lower
  on public.teams (lower(trim(coalesce(workspace_name, ''))));
