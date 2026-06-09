/*
  GêLeads – Schema de leads para Supabase
  Execute no SQL Editor do Supabase.
*/

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  source TEXT DEFAULT 'direto',
  campaign TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  notes TEXT,
  assigned_to UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'nota',
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads(status);
CREATE INDEX IF NOT EXISTS leads_created_by_idx ON public.leads(created_by);
CREATE INDEX IF NOT EXISTS leads_assigned_to_idx ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS lead_activities_lead_id_idx ON public.lead_activities(lead_id);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leads_select ON public.leads;
CREATE POLICY leads_select ON public.leads FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS leads_insert ON public.leads;
CREATE POLICY leads_insert ON public.leads FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS leads_update ON public.leads;
CREATE POLICY leads_update ON public.leads FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS leads_delete ON public.leads;
CREATE POLICY leads_delete ON public.leads FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS lead_activities_select ON public.lead_activities;
CREATE POLICY lead_activities_select ON public.lead_activities FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_id AND (l.created_by = auth.uid() OR l.assigned_to = auth.uid() OR public.is_admin())
  ));

DROP POLICY IF EXISTS lead_activities_insert ON public.lead_activities;
CREATE POLICY lead_activities_insert ON public.lead_activities FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
