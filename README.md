# GêChat — Chat interno corporativo

Aplicação de chat em tempo real para equipes, com autenticação Supabase, persistência em Neon e módulo GêChat no painel User.

Repositório: [github.com/genesisempreendimentos-tech/GeChat](https://github.com/genesisempreendimentos-tech/GeChat)

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
- `SUPABASE_SERVICE_ROLE_KEY` — perfis e listagem de usuários
- `DATABASE_URL` — Neon Postgres (dados do GêChat)

No frontend, configure em `frontend/.env`:

- `VITE_API_URL=http://localhost:3031`
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- `VITE_GECHAT_AUDIT_SLUG=gechat`

## Estrutura

- **User** — painel principal com o módulo GêChat (`/gechat`)
- **Vitrine** — protótipo de referência com placeholders
- **Admin** — gestão administrativa
- **Auth** — login, cadastro, reset de senha via Supabase

## Build de produção

```bash
npm run build:prod
```

## Supabase (referência SQL)

Migrations de auth/perfis em `frontend/src/services/migration-gechat-*.sql` e `migration-profiles-*.sql` — executar manualmente no SQL Editor do Supabase conforme necessário.
