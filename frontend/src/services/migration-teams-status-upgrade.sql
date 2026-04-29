-- Migração: teams.is_active (boolean) → teams.status (active | archived | deleted)
-- Execute no Supabase se você já criou a tabela com is_active.
-- Se a tabela ainda não existe, use apenas migration-teams-table.sql (já com status).

alter table public.teams add column if not exists status text;

update public.teams
set status = case when coalesce(is_active, true) then 'active' else 'archived' end
where status is null;

alter table public.teams alter column status set default 'active';

update public.teams set status = 'active' where status is null or trim(status) = '';

alter table public.teams alter column status set not null;

alter table public.teams drop constraint if exists teams_status_check;
alter table public.teams
  add constraint teams_status_check check (status in ('active', 'archived', 'deleted'));

drop index if exists public.idx_teams_is_active;
create index if not exists idx_teams_status on public.teams (status);

alter table public.teams drop column if exists is_active;

drop policy if exists "teams_select_active_for_authenticated" on public.teams;
create policy "teams_select_active_for_authenticated"
  on public.teams
  for select
  to authenticated
  using (status = 'active');

comment on column public.teams.status is 'active = visível no app usuário; archived = só admin; deleted = excluído (soft), só admin.';
