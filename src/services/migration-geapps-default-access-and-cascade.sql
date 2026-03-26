/*
  Regras de acesso do GêApps

  1) Novo usuário nasce com acesso ao GêApps:
     - cria automaticamente linha em public.user_app_access com access = true
     - app_id fixo do GêApps: d1623d11-e393-48a2-b402-279d013ae246

  2) Se access do GêApps virar false, todos os apps do usuário também viram false:
     - trigger centralizada em public.user_app_access
*/

-- 1) Acesso padrão ao GêApps no cadastro do auth.users
create or replace function public.grant_default_geapps_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_app_access (user_id, app_id, access, access_type)
  values (new.id, 'd1623d11-e393-48a2-b402-279d013ae246', true, 'member')
  on conflict (user_id, app_id)
  do update set access = true, updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_default_geapps_access on auth.users;
create trigger on_auth_user_default_geapps_access
  after insert on auth.users
  for each row execute procedure public.grant_default_geapps_access();

-- 2) Cascata de bloqueio: GêApps false => todos os apps false
create or replace function public.cascade_geapps_access_revoke()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.app_id = 'd1623d11-e393-48a2-b402-279d013ae246'::uuid and new.access = false then
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

drop trigger if exists trg_cascade_geapps_access_revoke on public.user_app_access;
create trigger trg_cascade_geapps_access_revoke
  after insert or update of access on public.user_app_access
  for each row execute procedure public.cascade_geapps_access_revoke();
