/*
  OBSOLETO — NÃO EXECUTAR

  A tabela `public.leads` no Supabase foi substituída pelo Neon:
  - all_leads          (união pura das 14 fontes)
  - all_leads_unique   (1 linha por pessoa)
  - leads_antigos, leads_cvcrm (tabelas-fonte)

  Schema Neon: backend/migrations/neon-leads.sql
  Supabase permanece apenas para autenticação.
*/

-- Se ainda existir legado no Supabase (opcional):
-- DROP TABLE IF EXISTS public.lead_activities;
-- DROP TABLE IF EXISTS public.leads;
