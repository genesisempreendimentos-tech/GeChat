# GêChat — Chat interno corporativo

Aplicação de chat em tempo real para equipes, com autenticação Supabase, persistência em Neon e módulo GêChat no painel User.

Repositório: [github.com/genesisempreendimentos-tech/GeChat](https://github.com/genesisempreendimentos-tech/GeChat)

## Executar

Na raiz do projeto:

```bash
npm install
npm run dev
```

Isso sobe o backend e o frontend ao mesmo tempo:

- **Frontend:** http://localhost:5180
- **Backend (API):** http://localhost:3080

Para rodar apenas um deles:

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

- `VITE_API_URL=http://localhost:3080`
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- `VITE_GECHAT_AUDIT_SLUG=gechat`

Portas padrão em desenvolvimento: frontend **5180**, backend **3080** (`SERVER_PORT` em `backend/.env`). Para alterar a porta do Vite, use `FRONTEND_PORT` ao subir o dev server.

### Acesso pela rede local (celular / outro PC)

Com `npm run dev`, o frontend escuta em `0.0.0.0` e o terminal mostra URLs **Network** (ex.: `http://192.168.x.x:5180`). Use essa URL no mesmo Wi‑Fi.

- API e WebSocket passam pelo proxy do Vite — não é preciso abrir a porta do backend no celular.
- No Supabase (Authentication → URL Configuration), adicione a URL de rede em **Redirect URLs** se for testar login pelo IP.
- Se o Windows Firewall bloquear, permita Node.js nas redes privadas.

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
