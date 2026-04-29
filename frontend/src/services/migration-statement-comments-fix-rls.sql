-- Correção das políticas RLS para statement_comment
-- Execute este script no SQL Editor do Supabase se já rodou o script anterior

-- Remove políticas existentes para recriar corretamente
drop policy if exists "Comentários são visíveis para todos os usuários autenticados" on public.statement_comment;
drop policy if exists "Usuários podem criar seus próprios comentários" on public.statement_comment;
drop policy if exists "Usuários podem atualizar seus próprios comentários" on public.statement_comment;
drop policy if exists "Usuários podem deletar seus próprios comentários" on public.statement_comment;

-- Recria com as permissões corretas
create policy "Comentários são visíveis para todos os usuários autenticados"
  on public.statement_comment for select
  to authenticated
  using (true);

create policy "Usuários podem criar seus próprios comentários"
  on public.statement_comment for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Usuários podem deletar seus próprios comentários"
  on public.statement_comment for delete
  to authenticated
  using (auth.uid() = user_id);
