-- DDL/RLS de audit_logs (instância compartilhada GêApps). Sem seed de apps ou user_app_access.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  app_id uuid NULL REFERENCES public.apps(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NULL,
  entity_id text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  "timestamp" timestamptz NULL DEFAULT now(),
  email text NULL,
  url text NULL,
  hostname text NULL,
  screen_time_seconds integer NULL,
  screen_time_ms bigint NULL,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON public.audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_app_id ON public.audit_logs (app_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_app_action_created
  ON public.audit_logs (actor_user_id, app_id, action, created_at);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs insert own" ON public.audit_logs;
CREATE POLICY "audit_logs insert own"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

DROP POLICY IF EXISTS "audit_logs select own or admin" ON public.audit_logs;
CREATE POLICY "audit_logs select own or admin"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (actor_user_id = auth.uid() OR public.is_admin());
