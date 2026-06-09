# G?Leads ? Acompanhamento de Leads

Plataforma para cadastro, acompanhamento e gest?o de leads com autentica??o via Supabase.

## Executar

```bash
cd frontend && npm install && npm run dev
cd backend && npm install && npm run dev
```

## Configura??o

Copie `.env.example` para `backend/.env` e configure:

- `SUPABASE_URL` e `SUPABASE_ANON_KEY` ? autentica??o
- `SUPABASE_SERVICE_ROLE_KEY` ? opera??es administrativas (opcional)
- `NEON_GETEAMS_DATABASE_URL` ? opcional, perfil corporativo

No frontend, configure em `.env` (ou vari?veis Vite):

- `VITE_API_URL=http://localhost:3001`
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- `VITE_GELEADS_AUDIT_SLUG=geleads`

## Funcionalidades

- Dashboard com m?tricas de leads
- CRUD de leads com pipeline (novo ? ganho/perdido)
- Autentica??o (login, cadastro, reset de senha)
- Perfil e configura??es do usu?rio
