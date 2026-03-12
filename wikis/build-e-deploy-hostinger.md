# Build e deploy na Hostinger (PHP/HTML)

## Pré-requisitos

1. **Variáveis de ambiente**  
   Crie ou edite o arquivo `.env` na raiz do projeto com as variáveis que o frontend usa em **build time** (são embutidas no bundle):

   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-anon-key
   ```

   Obtenha em: [Supabase Dashboard](https://supabase.com/dashboard) → seu projeto → **Settings** → **API**.

2. **Node.js**  
   Use uma versão LTS (ex.: 18 ou 20). No terminal: `node -v`.

---

## Gerar o build

Na raiz do projeto:

```bash
npm install
npm run build
```

- O TypeScript é checado (`tsc`) e em seguida o Vite gera o build.
- A pasta de saída é **`dist/`**.

Se der erro de tipo, corrija os arquivos indicados e rode de novo.  
Se faltar `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY`, o build ainda pode concluir, mas o app exibirá aviso no console e login/dados não funcionarão até você configurar e gerar o build de novo.

---

## Deploy na Hostinger

1. Acesse o **Gerenciador de Arquivos** (ou FTP) do seu plano Hostinger.
2. Vá até a pasta **`public_html`** (ou a pasta que serve o site).
3. **Faça upload de todo o conteúdo da pasta `dist/`** (não da pasta `dist` em si):
   - `index.html` na raiz de `public_html`
   - pasta `assets/` com os JS e CSS
   - demais arquivos/pastas que estiverem em `dist/` (ex.: `GeIcons/`, `assets/systems/`, `.htaccess`).

O `.htaccess` já está em `public/` e é copiado para `dist/` no build. Ele faz o Apache redirecionar rotas (ex.: `/dashboard`, `/login`) para `index.html`, para o React Router funcionar.

---

## Aba Corporativo (perfil) – API em PHP

A aba **Corporativo** do perfil busca dados no banco **Neon (GeTeams)**. Na Hostinger isso é feito por um script **PHP** que já vai dentro de `dist/api/` no build. A config usa **`.env`** na pasta `api/` (igual ao outro projeto que funciona na Hostinger).

### O que fazer na Hostinger

1. **Confirme que o plano tem suporte a PostgreSQL no PHP**  
   (extensão `pdo_pgsql`). No painel Hostinger, em “Versão do PHP” ou “Extensões PHP”, verifique se PostgreSQL/`pdo_pgsql` está habilitado.

2. **Crie o `.env` da API** (uma vez só):
   - No servidor, dentro de `public_html/api/`, copie **`.env.example`** para **`.env`** (renomeie ou crie um arquivo chamado `.env`).
   - Edite o `.env` e preencha:
     - `SUPABASE_URL` e `SUPABASE_ANON_KEY` (mesmos do Supabase do GêApps).
     - `NEON_GETEAMS_DATABASE_URL`: connection string do banco Neon do projeto GeTeams (ex.: `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`).

3. **Não commite** o arquivo `.env` (ele já está no `.gitignore`). Só existe no servidor.

4. **Deixe `VITE_GEAPPS_API_URL` vazio ou ausente** no `.env` usado no build. Assim o front usa a URL relativa `/api/corporate-profile` (mesmo domínio). Não defina como `http://localhost:3001` no build de produção.

### Estrutura esperada em `public_html` após o deploy

```
public_html/
├── index.html
├── assets/
├── .htaccess
└── api/
    ├── corporate-profile.php
    ├── config.php
    ├── .env.example
    └── .env   ← criar no servidor (copie de .env.example e preencha; não vem no dist)
```

### Teste rápido antes de abrir o app

Acesse no navegador:

`https://seu-dominio.com.br/api/corporate-profile.php`

| Resposta | Significado |
|----------|-------------|
| `{"error":"Token ausente..."}` (401) | PHP funcionando, estrutura correta. O token é enviado quando o usuário está logado no app. |
| 404 | `corporate-profile.php` não está em `public_html/api/`. Confira o upload do conteúdo de `dist/`. |
| 503 (JSON "Conexão com banco corporativo não configurada" / "Indisponível: banco corporativo") | Crie `api/.env` a partir de `.env.example` e preencha; ou verifique extensão **pdo_pgsql**, firewall/porta 5432 e credenciais no `.env`. |

O script PHP repassa o header `Authorization` quando o servidor o envia como `REDIRECT_HTTP_AUTHORIZATION` (comum no LiteSpeed/Apache após rewrite), então o token deve chegar mesmo em ambientes que removem o header padrão.

### Neon + Hostinger: endpoint no DSN (libpq antiga)

Em alguns planos (ex.: Hostinger), o PHP usa uma **versão antiga da libpq** que **não envia o hostname completo via SNI**. O Neon usa SNI para rotear a conexão ao endpoint correto; sem isso pode ocorrer erro do tipo *"Endpoint ID is not specified"*.

O `corporate-profile.php` já trata isso: **extrai o endpoint** do host da connection string (ex.: `ep-icy-glade-acujmv2i` a partir de `ep-icy-glade-acujmv2i-pooler.sa-east-1.aws.neon.tech`) e **adiciona ao DSN** a opção `options=endpoint=<id>`. Assim o Neon recebe o endpoint explicitamente e a conexão funciona mesmo com libpq antiga.

Em sistemas futuros que usem PHP + Neon em hospedagem compartilhada, incluir essa lógica no script que monta o DSN (extrair `ep-xxx` do host e concatenar `;options=endpoint=$endpoint` ao DSN).

---

## Resumo

| Etapa              | Comando / Ação                                      |
|--------------------|-----------------------------------------------------|
| Configurar env     | `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` |
| Build              | `npm run build`                                     |
| Saída              | Pasta `dist/`                                       |
| Deploy             | Enviar **conteúdo** de `dist/` para `public_html`   |
| Corporativo        | Em `public_html/api/`, copiar `.env.example` para `.env` e preencher SUPABASE_URL, SUPABASE_ANON_KEY e NEON_GETEAMS_DATABASE_URL |

Após o upload, acesse o domínio configurado na Hostinger; o app deve carregar e o login usar o Supabase com as variáveis definidas no build. Para a aba **Corporativo** do perfil funcionar, crie `api/.env` a partir de `.env.example` e confirme suporte a PostgreSQL no PHP.

**Backend em produção:** não é preciso rodar Node na Hostinger. O backend é o **PHP** (`api/corporate-profile.php`): o Apache executa o script automaticamente quando uma requisição chega em `/api/corporate-profile`. Basta manter os arquivos da pasta `api/` e o **`.env`** configurado no servidor (copiado de `.env.example`).
