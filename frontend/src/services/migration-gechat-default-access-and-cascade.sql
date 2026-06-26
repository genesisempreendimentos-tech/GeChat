/*
  SQL legado de referência — o frontend deste repo roda só como mock de UI.
  UUID do app hub alinhado ao mock em `src/services/supabase.ts` (GECHAT_APP_ID).
*/

-- 1) Acesso padrão ao hub no cadastro do auth.users
create or replace function public.grant_default_gechat_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_app_access (user_id, app_id, access, access_type)
  values (new.id, '00000000-0000-4000-8000-000000000001', true, 'member')
  on conflict (user_id, app_id)
  do update set access = true, updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_default_gechat_access on auth.users;
create trigger on_auth_user_default_gechat_access
  after insert on auth.users
  for each row execute procedure public.grant_default_gechat_access();

-- 2) Cascata de bloqueio: hub false => todos os apps false
create or replace function public.cascade_gechat_access_revoke()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.app_id = '00000000-0000-4000-8000-000000000001'::uuid and new.access = false then
    update public.user_app_access
       set access = false,
           is_favorite = false,
           updated_at = now()
     where user_id = new.user_id
       and access is distinct from false;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_cascade_gechat_access_revoke on public.user_app_access;
create trigger trg_cascade_gechat_access_revoke
  after insert or update of access on public.user_app_access
  for each row execute procedure public.cascade_gechat_access_revoke();
