# Autenticação centralizada com GêApps

Este documento descreve como usar o **GêApps** como provedor central de autenticação para os demais aplicativos do ecossistema Genesis (GeTeams, GeForms, etc.), usando **Supabase Auth** e sessão compartilhada entre subdomínios. Use este guia para **atualizar o GeTeams** (ou qualquer app irmão).

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
2. O app verifica se existe sessão (via **cookies** no domínio pai quando em `*.genesisapps.com.br` — ver `getAuthStorage()`).
3. **Se não há sessão:** exibe uma tela com o botão **"Entrar com GêApps"**, que redireciona para:
   ```
   https://geapps.genesisapps.com.br/login?returnTo=https://geteams.genesisapps.com.br/
   ```
   (Use a URL completa do app como `returnTo`, ex.: `window.location.origin + '/'` ou a rota desejada após o login.)
4. O usuário faz login no GêApps (email/senha, Supabase Auth) **ou já está logado**.
5. **Se já estava logado:** o GêApps detecta a sessão na rota `/login?returnTo=...` e **redireciona imediatamente** para o `returnTo` (tela "Redirecionando..." e depois redirect para o app irmão).
6. **Se acabou de fazer login:** após sucesso, o GêApps redireciona para o valor de `returnTo` (apenas se a URL for permitida: HTTPS e host em `*.genesisapps.com.br`).
7. O usuário volta ao GeTeams já autenticado (o cookie de sessão está no domínio `.genesisapps.com.br` e é lido pelo GeTeams se ele usar o **mesmo** `getAuthStorage()`).
8. O GeTeams verifica na tabela **`user_app_access`** se esse usuário tem acesso ao app (pelo **slug** `geteams`).
9. **Se tiver acesso:** o usuário entra normalmente no app.
10. **Se não tiver acesso:** redirecionar para `https://geapps.genesisapps.com.br/access-denied?reason=app` ou exibir página local com a mensagem e link para o GêApps.

### 2.2 Resumo do fluxo

```
[App irmão] → sem sessão → "Entrar com GêApps" → [GêApps /login?returnTo=...]
     ↑                                                          |
     |                                    usuário faz login OU já está logado
     |                                                          |
     |                                                          v
     +-------- redirect para returnTo (app irmão) ---------------+
     |
     v
[App irmão] → com sessão (cookie) → consulta user_app_access por slug
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
- **Usuário já logado:** se o usuário acessar `/login?returnTo=...` já autenticado, o GêApps **não** exibe o formulário de login; redireciona diretamente para o `returnTo` (componente `LoginRoute` em `App.tsx`). Assim, ao clicar em "Entrar com GêApps" no GeTeams estando já logado no GêApps, o usuário volta ao GeTeams.
- **Após digitar email/senha:** após login com sucesso, se `returnTo` for válido, o usuário é redirecionado para essa URL em vez de `/dashboard`.

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
  - Copiar o arquivo **`src/services/authStorage.ts`** do GêApps (caminho no repositório GeApps: `src/services/authStorage.ts`). **Não altere** prefixos nem domínio — o código deve ser idêntico para os cookies serem compartilhados.
  - Instanciar o cliente assim:
    ```ts
    import { createClient } from '@supabase/supabase-js';
    import { getAuthStorage } from './authStorage'; // ou src/services/authStorage

    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      { auth: { storage: getAuthStorage() } }
    );
    ```

### 4.2 Definir o slug do app

- Cada app deve saber seu **slug** (ex.: `geteams`, `geforms`), que deve existir na tabela **`apps`** e em **`user_app_access`** para controle de acesso.
- No GeTeams use o slug **`geteams`** (igual ao subdomínio em `geteams.genesisapps.com.br`). Defina uma constante, ex.: `const APP_SLUG = 'geteams';`.

### 4.3 Tela "Entrar com GêApps"

- Quando **não** houver sessão, exibir uma tela com um botão/link **"Entrar com GêApps"** que redirecione para:
  ```
  https://geapps.genesisapps.com.br/login?returnTo=<URL_ATUAL_DO_APP>
  ```
  Exemplo para GeTeams (use a origem atual para funcionar em produção e em localhost):
  ```ts
  import { GEAPPS_BASE_URL } from './authStorage'; // exportado em authStorage.ts

  const loginUrl = `${GEAPPS_BASE_URL}/login?returnTo=${encodeURIComponent(window.location.origin + '/')}`;
  // Ex.: https://geapps.genesisapps.com.br/login?returnTo=https%3A%2F%2Fgeteams.genesisapps.com.br%2F
  window.location.href = loginUrl;
  ```
  Use a URL completa do app (incluindo barra final ou path desejado, ex.: `window.location.origin + '/dashboard'`) para o usuário voltar ao mesmo lugar após o login.

### 4.4 Ao carregar o app (ou após retorno do login)

1. Obter a sessão: `const { data: { session } } = await supabase.auth.getSession();` (ou `getUser()`).
2. Se **não** houver sessão → mostrar a tela "Entrar com GêApps" (link acima).
3. Se **houver** sessão:
   - Obter `userId`: `session.user.id`.
   - Verificar acesso com **`userHasAccessToAppBySlug(userId, APP_SLUG)`**. No app irmão você pode replicar a lógica (consultas às tabelas `apps` e `user_app_access`) usando o **mesmo** cliente Supabase; o RLS do Supabase já restringe os dados por usuário.
   - **Se tiver acesso:** seguir normalmente (renderizar o app).
   - **Se não tiver acesso:** redirecionar para `https://geapps.genesisapps.com.br/access-denied?reason=app` ou exibir página local com a mensagem e link para o GêApps.

### 4.5 Resumo para o desenvolvedor do app irmão

| Etapa | Ação |
|-------|------|
| Supabase | Mesmo projeto: mesma URL e anon key; cliente com `auth: { storage: getAuthStorage() }`. |
| authStorage | Copiar `src/services/authStorage.ts` do GêApps sem alterar (cookies no domínio `.genesisapps.com.br`). |
| Slug | Definir slug do app (ex.: `geteams`) e garantir que exista em `apps` e em `user_app_access` para os usuários liberados. |
| Sem sessão | Mostrar "Entrar com GêApps" → link para `GEAPPS_BASE_URL/login?returnTo=<url_do_app>`. |
| Com sessão | Verificar acesso com `userHasAccessToAppBySlug(userId, slug)`. |
| Sem acesso | Redirecionar para `/access-denied?reason=app` no GêApps ou exibir página local "Ops, você não tem acesso a esse app." + link para GêApps. |

---

## 4.6 Checklist de implementação no GeTeams (ou outro app irmão)

Siga esta ordem ao atualizar o GeTeams:

1. **Variáveis de ambiente**  
   - Definir `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (mesmos valores do GêApps).  
   - Opcional: `VITE_GEAPPS_BASE_URL=https://geapps.genesisapps.com.br` (usado por `authStorage.ts` fora de `*.genesisapps.com.br`).

2. **Copiar `authStorage.ts`**  
   - Do GêApps: `src/services/authStorage.ts` → no GeTeams: mesmo caminho `src/services/authStorage.ts` (ou ajustar imports).  
   - Não alterar constantes (`AUTH_COOKIE_PREFIX`, `ALLOWED_DOMAIN`, etc.) para os cookies continuarem compartilhados.

3. **Cliente Supabase**  
   - Criar o cliente Supabase **com** `auth: { storage: getAuthStorage() }` (ver trecho em 4.1).  
   - Garantir que **todas** as chamadas de auth usem esse cliente (não criar um segundo cliente sem storage).

4. **Slug do app**  
   - Definir `APP_SLUG = 'geteams'`.  
   - Confirmar no Supabase que existe um registro em `apps` com `slug = 'geteams'` e que o usuário tem linha em `user_app_access` com `access = true` para esse app.

5. **Tela de login (sem sessão)**  
   - Se `getSession()` não retornar sessão, exibir tela com botão "Entrar com GêApps".  
   - O botão deve redirecionar para `GEAPPS_BASE_URL + '/login?returnTo=' + encodeURIComponent(window.location.origin + '/')` (ou path desejado após retorno).

6. **Verificação de acesso (com sessão)**  
   - Ao carregar o app (e após retorno do GêApps), se houver sessão, chamar a lógica equivalente a `userHasAccessToAppBySlug(userId, APP_SLUG)`.  
   - Se não tiver acesso, redirecionar para `https://geapps.genesisapps.com.br/access-denied?reason=app` ou página local com link para o GêApps.

7. **Rotas protegidas**  
   - Garantir que rotas como `/dashboard` só sejam acessíveis após: (1) existir sessão e (2) `userHasAccessToAppBySlug` retornar true. Caso contrário, redirecionar para a tela "Entrar com GêApps" ou para a página de acesso negado.

---

## 4.7 Código de verificação de acesso (para copiar no app irmão)

O GêApps expõe `getAppBySlug` e `userHasAccessToAppBySlug` em `src/services/supabase.ts` (databaseService). No GeTeams você pode **replicar** a lógica abaixo usando o **mesmo** cliente Supabase (com `getAuthStorage()`). O RLS do Supabase já restringe o que o usuário pode ler.

```ts
// Exemplo: funções que você pode implementar no GeTeams (ou em um serviço compartilhado).
// Suponha que `supabase` seja o cliente criado com getAuthStorage().

async function getAppBySlug(supabase: SupabaseClient, slug: string) {
  const normalized = (slug || '').toLowerCase().trim().replace(/\s+/g, '');
  if (!normalized) return { data: null, error: null };
  const { data, error } = await supabase
    .from('apps')
    .select('id, status')
    .ilike('slug', normalized)
    .maybeSingle();
  return { data, error };
}

async function userHasAccessToApp(supabase: SupabaseClient, userId: string, appId: string) {
  const { data: app, error: appError } = await supabase
    .from('apps')
    .select('id, status')
    .eq('id', appId)
    .single();
  if (appError || !app) return { data: false, error: appError };
  const status = (app.status ?? '').toString().toLowerCase();
  if (status !== 'ativo' && status !== 'beta') return { data: false, error: null };
  const { data: accessRow, error: accessError } = await supabase
    .from('user_app_access')
    .select('access')
    .eq('user_id', userId)
    .eq('app_id', appId)
    .maybeSingle();
  if (accessError) return { data: false, error: accessError };
  return { data: accessRow?.access === true, error: null };
}

async function userHasAccessToAppBySlug(
  supabase: SupabaseClient,
  userId: string,
  slug: string
) {
  const { data: app, error: appErr } = await getAppBySlug(supabase, slug);
  if (appErr || !app) return { data: false, error: appErr };
  return userHasAccessToApp(supabase, userId, app.id);
}
```

Uso típico no GeTeams ao carregar a aplicação:

```ts
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  // Mostrar tela "Entrar com GêApps" e redirecionar para GEAPPS_BASE_URL/login?returnTo=...
  return;
}
const { data: hasAccess } = await userHasAccessToAppBySlug(supabase, session.user.id, 'geteams');
if (!hasAccess) {
  window.location.href = 'https://geapps.genesisapps.com.br/access-denied?reason=app';
  return;
}
// Renderizar o app (ex.: dashboard).
```

---

## 4.8 Arquivos do GêApps a copiar ou referenciar

| Arquivo no GêApps | Uso no app irmão |
|-------------------|-------------------|
| `src/services/authStorage.ts` | **Copiar** para o projeto (ex.: `src/services/authStorage.ts`). Define `getAuthStorage()`, `GEAPPS_BASE_URL` e `isAllowedReturnToUrl`. Não altere o conteúdo para manter cookies compartilhados. |
| `src/services/supabase.ts` (trechos) | **Referência:** criação do cliente com `getAuthStorage()` (início do arquivo) e lógica de `getAppBySlug` / `userHasAccessToApp` / `userHasAccessToAppBySlug` (se não quiser copiar o código da seção 4.7). |

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

## 9. Problemas comuns

| Sintoma | Causa provável | Solução |
|--------|----------------|---------|
| Ao clicar "Entrar com GêApps" já logado, cai no dashboard do GêApps em vez de voltar ao GeTeams. | GêApps não redirecionando para `returnTo` quando o usuário já está autenticado. | Já corrigido no GêApps: componente `LoginRoute` em `App.tsx` redireciona para `returnTo` quando há sessão. Garantir que está usando a versão atual do GeApps. |
| Após voltar do GêApps para o GeTeams, o GeTeams ainda mostra a tela de login ou redireciona para login. | O GeTeams não está usando o **mesmo** storage de auth (cookies no domínio pai). | Copiar `authStorage.ts` do GêApps e criar o cliente Supabase com `auth: { storage: getAuthStorage() }`. Não usar apenas `localStorage` padrão do Supabase. |
| "Você não tem acesso a esse app" mesmo com acesso liberado. | Slug incorreto; app inativo; ou sem linha em `user_app_access`. | Verificar em `apps` o `slug` exato (ex.: `geteams`). Verificar em `user_app_access` se existe `user_id`, `app_id` e `access = true`. Verificar `apps.status` (deve ser `ativo` ou `beta`). |
| Em localhost o redirect não funciona ou dá erro. | Redirect URLs do Supabase não incluem a origem do app irmão. | No Supabase (Authentication → URL Configuration), adicionar ex.: `http://localhost:5173/**` (ou a porta do GeTeams em dev). |
| Sessão existe no GêApps mas não no GeTeams no mesmo navegador. | Domínios diferentes (ex.: localhost vs produção) não compartilham cookies. | Em `*.genesisapps.com.br` os cookies são compartilhados; em localhost cada origem tem seu próprio storage. Para testar fluxo completo em dev, use subdomínios locais ou aceite fazer login de novo no app irmão em localhost. |

---

## 10. Resumo rápido

- **GêApps:** hub + login; sessão em cookie no domínio pai (`getAuthStorage()`); rota `/login` com `returnTo` — ao **já estar logado** redireciona para `returnTo`, ao fazer login redireciona para `returnTo` ou `/dashboard`; APIs `getAppBySlug` e `userHasAccessToAppBySlug`; página `/access-denied?reason=app`.
- **Apps irmãos (GeTeams, etc.):** mesmo Supabase + **copiar** `authStorage.ts` e usar `auth: { storage: getAuthStorage() }`; tela "Entrar com GêApps" com link `GEAPPS_BASE_URL/login?returnTo=<url_do_app>`; ao carregar, checar sessão e `userHasAccessToAppBySlug(userId, slug)`; sem acesso → `/access-denied?reason=app` no GêApps ou página local.
- **Supabase:** Redirect URLs para todos os hosts (produção com `/**` e localhost com porta); tabelas `apps.slug` e `user_app_access` com RLS já previstos nas migrations.
