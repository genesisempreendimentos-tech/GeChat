-- GêApps — Comunicados: estado “visto” só na tabela `statement` (coluna `viewed`).
-- O app não usa a tabela `statement_reads`; pode ignorar ficheiros/SQL antigos que a criavam.

ALTER TABLE public.statement
ADD COLUMN IF NOT EXISTS viewed boolean NOT NULL DEFAULT false;

-- Política RLS de UPDATE em `statement` para membros autenticados marcarem `viewed` ao abrir o post.
-- Ajuste USING / WITH CHECK ao vosso modelo (ex.: só quem pode SELECT o comunicado).

-- Exemplo genérico (restringir em produção):
-- CREATE POLICY "statement_authenticated_update"
--   ON public.statement FOR UPDATE TO authenticated
--   USING (true) WITH CHECK (true);
