# GêNovo — Template SaaS

Starter reutilizável com design system completo, autenticação Supabase e painéis modulares (User, Vitrine, Admin).

Repositório: [github.com/genesisempreendimentos-tech/GeNovo](https://github.com/genesisempreendimentos-tech/GeNovo)

## Executar

Na raiz do projeto:

```bash
npm install
npm run dev
```

Isso sobe o backend e o frontend ao mesmo tempo. Para rodar apenas um deles:

```bash
npm run dev:backend
npm run dev:frontend
```

## Configuração

Copie `.env.example` para `backend/.env` e configure:

- `SUPABASE_URL` e `SUPABASE_ANON_KEY` — autenticação
- `SUPABASE_SERVICE_ROLE_KEY` — operações administrativas (opcional)

No frontend, configure em `frontend/.env`:

- `VITE_API_URL=http://localhost:3001`
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- `VITE_GENOVO_AUDIT_SLUG=genovo`

## Estrutura

- **User** — painel principal (módulos a construir)
- **Vitrine** — protótipo de referência com placeholders
- **Admin** — gestão administrativa
- **Auth** — login, cadastro, reset de senha via Supabase

## Build de produção

```bash
npm run build:prod
```

## Deploy (VPS)

Scripts em `deploy/`:

- `install.sh` — instalação inicial (clone, build, PM2, nginx)
- `deploy.sh` — pull + build + restart
- `nginx-genovo.conf` — proxy reverso para o Node
- `ecosystem.config.cjs` — processo PM2 `genovo`

## Supabase (referência SQL)

Migrations de auth/perfis em `frontend/src/services/migration-genovo-*.sql` e `migration-profiles-*.sql` — executar manualmente no SQL Editor do Supabase conforme necessário.
