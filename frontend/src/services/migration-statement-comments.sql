-- Criação da tabela de comentários para os comunicados
create table if not exists public.statement_comment (
  id uuid default gen_random_uuid() primary key,
  statement_id uuid not null references public.statement(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone,
  is_active boolean default true not null
);

-- Índices para performance
create index if not exists idx_statement_comment_statement_id on public.statement_comment(statement_id);
create index if not exists idx_statement_comment_user_id on public.statement_comment(user_id);

-- RLS (Row Level Security)
alter table public.statement_comment enable row level security;

-- Políticas de acesso
create policy "Comentários são visíveis para todos os usuários autenticados"
  on public.statement_comment for select
  to authenticated
  using (is_active = true and deleted_at is null);

create policy "Usuários podem criar seus próprios comentários"
  on public.statement_comment for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Usuários podem atualizar seus próprios comentários"
  on public.statement_comment for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Usuários podem deletar seus próprios comentários"
  on public.statement_comment for delete
  to authenticated
  using (auth.uid() = user_id);

-- Trigger para updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_statement_comment_updated_at on public.statement_comment;
create trigger set_statement_comment_updated_at
  before update on public.statement_comment
  for each row
  execute procedure public.handle_updated_at();
