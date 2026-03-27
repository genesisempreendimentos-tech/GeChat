-- Legado / referência — frontend deste repo é mock de UI.
-- Execute no SQL Editor do Supabase.
--
-- Requer a função public.is_appsadmin() (mesmo padrão das outras migrations do projeto).
-- Se não existir, crie-a ou substitua as políticas por regras equivalentes ao seu modelo de permissão.
--
-- Já tem teams com is_active? Rode antes migration-teams-status-upgrade.sql em vez de recriar a tabela.

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active' check (status in ('active', 'archived', 'deleted')),
  neon_department_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_neon_department_id_unique unique (neon_department_id)
);

create index if not exists idx_teams_status on public.teams (status);
create index if not exists idx_teams_name on public.teams (name);

comment on table public.teams is
  'Equipes (legado de schema).';

comment on column public.teams.status is 'active | archived | deleted (soft delete).';

alter table public.teams enable row level security;

-- Membros autenticados: só equipes ativas
drop policy if exists "teams_select_active_for_authenticated" on public.teams;
create policy "teams_select_active_for_authenticated"
  on public.teams
  for select
  to authenticated
  using (status = 'active');

-- Apps admin: vê todas as equipes
drop policy if exists "teams_select_all_for_appsadmin" on public.teams;
create policy "teams_select_all_for_appsadmin"
  on public.teams
  for select
  to authenticated
  using (public.is_appsadmin() = true);

drop policy if exists "teams_insert_appsadmin" on public.teams;
create policy "teams_insert_appsadmin"
  on public.teams
  for insert
  to authenticated
  with check (public.is_appsadmin() = true);

drop policy if exists "teams_update_appsadmin" on public.teams;
create policy "teams_update_appsadmin"
  on public.teams
  for update
  to authenticated
  using (public.is_appsadmin() = true)
  with check (public.is_appsadmin() = true);

drop policy if exists "teams_delete_appsadmin" on public.teams;
create policy "teams_delete_appsadmin"
  on public.teams
  for delete
  to authenticated
  using (public.is_appsadmin() = true);
