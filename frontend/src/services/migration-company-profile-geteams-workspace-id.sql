-- Id do workspace no Neon (public.workspaces), alinhado ao nome em ge_teams_workspace.
-- Execute no SQL Editor do Supabase.

alter table public.company_profile
  add column if not exists geteams_workspace_id text;

comment on column public.company_profile.geteams_workspace_id is
  'UUID/id do workspace no GeTeams (Neon); preenchido pela app a partir do nome em ge_teams_workspace.';
