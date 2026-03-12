# Autenticação centralizada com GêApps

Este documento descreve como usar o **GêApps** como provedor central de autenticação para os demais aplicativos do ecossistema Genesis (GeTeams, GeForms, etc.), usando **Supabase Auth** e sessão compartilhada entre subdomínios.

---

## 1. Visão geral

- **Domínio raiz:** `genesisapps.com.br`
- **GêApps (hub e login central):** `geapps.genesisapps.com.br`
- **Apps irmãos:** cada um em seu subdomínio, por exemplo:
  - `geteams.genesisapps.com.br` → GeTeams
  - `geforms.genesisapps.com.br` → GeForms

Todos os apps usam o **mesmo login** (Supabase Auth). O GêApps é o ponto único de entrada para login; após autenticar, a sessão é compartilhada entre subdomínios via **cookies** no domínio `.genesisapps.com.br`. O acesso a cada app é controlado pela tabela **`user_app_access`** no Supabase.

---

## 2. Fluxo de autenticação

### 2.1 Usuário acessa um app irmão (ex.: GeTeams)

1. Usuário abre `https://geteams.genesisapps.com.br`.
2. O app verifica se existe sessão (cookie/localStorage, conforme ambiente).
3. **Se não há sessão:** exibe uma tela com o botão **"Entrar com GêApps"**, que redireciona para:
   ```
   https://geapps.genesisapps.com.br/login?returnTo=https://geteams.genesisapps.com.br/
   ```
4. O usuário faz login no GêApps (email/senha, Supabase Auth).
5. Após login com sucesso, o GêApps redireciona de volta para o valor de `returnTo` (apenas se a URL for permitida: HTTPS e host em `*.genesisapps.com.br`).
6. O usuário volta ao GeTeams já autenticado (o cookie de sessão está no domínio pai).
7. O GeTeams verifica na tabela **`user_app_access`** se esse usuário tem acesso ao app (por exemplo, pelo **slug** `geteams`).
8. **Se tiver acesso:** o usuário entra normalmente no app.
9. **Se não tiver acesso:** o app redireciona para uma página de "sem acesso", por exemplo:
   ```
   https://geapps.genesisapps.com.br/access-denied?reason=app
   ```
   ou uma página equivalente no próprio app, com a mensagem **"Ops, você não tem acesso a esse app."** e um botão para voltar ao GêApps.

### 2.2 Resumo do fluxo

```
[App irmão] → sem sessão → "Entrar com GêApps" → [GêApps /login?returnTo=...]
     ↑                                                          |
     |                                                          v
     |                                              usuário faz login
     |                                                          |
     |                                                          v
     +-------- redirect para returnTo (app irmão) ---------------+
     |
     v
[App irmão] → com sessão → consulta user_app_access por slug
     |
     ├── tem acesso  → entra no app
     └── sem acesso  → /access-denied?reason=app (ou página local)
```

---

## 3. O que o GêApps já implementa

### 3.1 Storage de sessão (cookies entre subdomínios)

- Em **`*.genesisapps.com.br`** a sessão do Supabase Auth é armazenada em **cookies** com `domain=.genesisapps.com.br`, para ser compartilhada entre todos os subdomínios.
- Em **localhost** (ou outro host) é usado **localStorage**.
- Arquivo: `src/services/authStorage.ts` — função **`getAuthStorage()`**.

### 3.2 Login com retorno ao app de origem

- A página de login aceita o parâmetro **`returnTo`** na URL (ex.: `?returnTo=https://geteams.genesisapps.com.br/`).
- A URL é validada com **`isAllowedReturnToUrl()`**: apenas HTTPS e host em `genesisapps.com.br` ou subdomínios.
- Após login com sucesso, se `returnTo` for válido, o usuário é redirecionado para essa URL em vez de `/dashboard`.

### 3.3 APIs de acesso por app

No **`databaseService`** (`src/services/supabase.ts`):

- **`getAppBySlug(slug)`** — retorna o app da tabela `apps` cujo `slug` coincide (ex.: `geteams`, `geforms`). Respeita RLS (usuário só vê apps ativo/beta aos quais tem acesso).
- **`userHasAccessToApp(userId, appId)`** — verifica se o usuário tem registro em `user_app_access` com `access = true` e se o app está ativo/beta.
- **`userHasAccessToAppBySlug(userId, slug)`** — resolve o app pelo `slug` e chama `userHasAccessToApp`. Útil para o app irmão saber se o usuário pode entrar.

### 3.4 Página "sem acesso ao app"

- Rota: **`/access-denied?reason=app`**.
- Mensagem: **"Ops, você não tem acesso a esse app."**
- Botão: **"Voltar ao GêApps"** — leva a `GEAPPS_BASE_URL` (exportado em `authStorage.ts`).

---

## 4. O que cada app irmão deve implementar

Cada app (GeTeams, GeForms, etc.) precisa:

### 4.1 Mesmo projeto Supabase e mesmo storage

- Usar as **mesmas** variáveis **`VITE_SUPABASE_URL`** e **`VITE_SUPABASE_ANON_KEY`** do GêApps.
- Criar o cliente Supabase com o **mesmo storage** usado no GêApps, para que a sessão seja lida/escrita nos mesmos cookies quando estiver em `*.genesisapps.com.br`:
  - Copiar o arquivo **`src/services/authStorage.ts`** do GêApps (ou compartilhar via pacote/mono-repo) e usar:
    ```ts
    import { createClient } from '@supabase/supabase-js';
    import { getAuthStorage } from './authStorage'; // ou caminho equivalente

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { storage: getAuthStorage() },
    });
    ```

### 4.2 Definir o slug do app

- Cada app deve saber seu **slug** (ex.: `geteams`, `geforms`), que deve existir na tabela **`apps`** e em **`user_app_access`** para controle de acesso.
- O slug costuma ser derivado do subdomínio (ex.: `geteams.genesisapps.com.br` → slug `geteams`).

### 4.3 Tela "Entrar com GêApps"

- Quando **não** houver sessão, exibir uma tela com um botão/link **"Entrar com GêApps"** que redirecione para:
  ```
  https://geapps.genesisapps.com.br/login?returnTo=<URL_ATUAL_DO_APP>
  ```
  Exemplo para GeTeams:
  ```
  https://geapps.genesisapps.com.br/login?returnTo=https://geteams.genesisapps.com.br/
  ```
  Use a URL completa do app (incluindo barra final ou path desejado) para o usuário voltar ao mesmo lugar após o login.

### 4.4 Ao carregar o app (ou após retorno do login)

1. Obter a sessão: `supabase.auth.getSession()` ou `supabase.auth.getUser()`.
2. Se **não** houver sessão → mostrar a tela "Entrar com GêApps" (ver acima).
3. Se **houver** sessão:
   - Obter `userId` (ex.: `user.id` do `getUser()`).
   - Chamar **`userHasAccessToAppBySlug(userId, slugDoApp)`** (ou equivalente: `getAppBySlug(slug)` + `userHasAccessToApp(userId, appId)`). O GêApps já expõe isso no `databaseService`; no app irmão você pode usar o mesmo serviço ou replicar a lógica com o mesmo Supabase.
   - **Se tiver acesso:** seguir normalmente (renderizar o app).
   - **Se não tiver acesso:** redirecionar para:
     ```
     https://geapps.genesisapps.com.br/access-denied?reason=app
     ```
     ou exibir uma página local com a mesma mensagem e um link/botão para `https://geapps.genesisapps.com.br`.

### 4.5 Resumo para o desenvolvedor do app irmão

| Etapa | Ação |
|-------|------|
| Supabase | Mesmo projeto: mesma URL e anon key; cliente com `auth: { storage: getAuthStorage() }`. |
| Slug | Definir slug do app (ex.: `geteams`) e garantir que exista em `apps` e em `user_app_access` para os usuários liberados. |
| Sem sessão | Mostrar "Entrar com GêApps" → link para `geapps.../login?returnTo=<url_do_app>`. |
| Com sessão | Verificar acesso com `userHasAccessToAppBySlug(userId, slug)`. |
| Sem acesso | Redirecionar para `/access-denied?reason=app` no GêApps ou exibir página local "Ops, você não tem acesso a esse app." + link para GêApps. |

---

## 5. Configuração no Supabase (Dashboard)

### 5.1 Redirect URLs (Authentication → URL Configuration)

Inclua **todas** as origens para as quais o Auth pode redirecionar após login (ou outros fluxos):

**Produção (subdomínios):**

- `https://geapps.genesisapps.com.br/**`
- `https://geteams.genesisapps.com.br/**`
- `https://geforms.genesisapps.com.br/**`
- (repetir para cada app em `*.genesisapps.com.br`)

Use **`/**`** no final para permitir qualquer path nesse host.

**Desenvolvimento local (localhost):**

- Inclua a **porta** usada pelo frontend, por exemplo:
  - `http://localhost:5173/**` (Vite)
  - `http://localhost:3000/**`
  - Ou a porta que o seu app usar.

Sem a URL exata (com porta) no localhost, redirects após login podem ser bloqueados.

### 5.2 Site URL

- Pode ficar como **`https://geapps.genesisapps.com.br`** (ou o valor que você já usa para e-mails e links do Auth).

---

## 6. Banco de dados (Supabase)

- **Tabela `apps`:** deve ter a coluna **`slug`** (ex.: `geteams`, `geforms`). As migrations do GêApps já preveem isso.
- **Tabela `user_app_access`:** colunas **`user_id`**, **`app_id`**, **`access`**. O acesso ao app é liberado quando existe uma linha com `access = true` e o app está com status **ativo** ou **beta**.
- **RLS:** já configurado nas migrations do GêApps: usuários autenticados veem apenas apps ativo/beta para os quais têm acesso em `user_app_access`; admin/softadmin veem e gerenciam tudo. Nenhum SQL extra é necessário para esse fluxo.

---

## 7. Variáveis de ambiente (app irmão)

- **Obrigatório:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (iguais ao GêApps).
- **Opcional:** `VITE_GEAPPS_BASE_URL` — URL do GêApps quando o app não está em `*.genesisapps.com.br` (ex.: em localhost), para montar o link "Entrar com GêApps" e "Voltar ao GêApps". Exemplo: `https://geapps.genesisapps.com.br`.

---

## 8. Exemplo de URL do link "Entrar com GêApps"

Para um app em produção:

```
https://geapps.genesisapps.com.br/login?returnTo=https://geteams.genesisapps.com.br/
```

Para desenvolvimento local (ex.: porta 5173):

```
https://geapps.genesisapps.com.br/login?returnTo=http://localhost:5173/
```

Ou, se o GêApps em dev estiver em outra porta:

```
http://localhost:5173/login?returnTo=http://localhost:3000/
```

(O `returnTo` deve ser uma URL permitida nas Redirect URLs do Supabase.)

---

## 9. Resumo rápido

- **GêApps:** hub + login; sessão em cookie no domínio pai; login com `returnTo`; APIs `getAppBySlug` e `userHasAccessToAppBySlug`; página `/access-denied?reason=app`.
- **Apps irmãos:** mesmo Supabase + mesmo `getAuthStorage()`; tela "Entrar com GêApps" com `returnTo`; ao carregar, checar sessão e `user_app_access` por slug; sem acesso → `/access-denied?reason=app` ou página local.
- **Supabase:** Redirect URLs para todos os hosts (produção com `/**` e localhost com porta); tabelas `apps.slug` e `user_app_access` com RLS já previstos nas migrations.
