# UI Shell Migration Report

## Dados reais no repositório

- Textos de UI, domínios de exemplo, URLs de storage, e-mails e identidade visual foram trocados por placeholders (`example.com`, `brand-mock.svg`, `demo` em banners, usuários em `uiShellData.ts`). Scripts e `.env.example` não apontam para infraestrutura real.

## O que foi removido/neutralizado

- Integrações reais com Supabase Auth/DB/Storage/Realtime foram neutralizadas em `src/services/supabase.ts`.
- Chamadas de API/proxy do perfil corporativo (Neon/PHP/`/api/*`) foram neutralizadas em `src/services/corporateProfile.ts`.
- Fluxos de autenticação real (validação de domínio, sessão remota e dependência de backend) foram convertidos para fluxo visual local no `authStore`.
- Operações de persistência (CRUD real, uploads reais, query/mutation reais) foram convertidas para simulação em memória.

## O que foi mockado

- Camada central de dados fake criada em:
  - `src/mocks/uiShellData.ts`
  - `src/mocks/uiShellUtils.ts`
- Usuários mockados (login visual) + **listagens vazias por padrão**: sistemas, categorias, favoritos (sem `is_favorite`), solicitações, comunicados, equipes, empresa (campos em branco), logs de acesso do dashboard, citações na sidebar; perfil corporativo (`getCorporateProfile`) retorna `notFound`.
- Serviços com retorno estável:
  - `authService`, `databaseService`, `storageService`, `chatService` em `src/services/supabase.ts`
  - funções de corporate profile/departamentos/colaboradores em `src/services/corporateProfile.ts`
- Cliente `supabase` mantido com interface compatível para não quebrar usos diretos da UI (`quotes`, `audit-log`, reset de senha etc.), porém com backend fake.

## Áreas que ainda podem depender de revisão manual

- Qualquer comportamento que dependa de persistência entre recargas agora é temporário (em memória).
- Fluxos de segurança e políticas de acesso foram simplificados para modo visual.
- Se desejar demo com dados mais ricos por tela, vale revisar conteúdo de mocks para cada contexto de negócio.
- Arquivos de backend (`server/*`, `public/api/*`) não são mais necessários para a execução visual do frontend, mas permanecem no projeto.

## Arquivos mais impactados

- `src/services/supabase.ts` (refatoração principal para modo mock).
- `src/services/corporateProfile.ts` (remoção de dependência de API externa).
- `src/store/authStore.ts` (auth/session visual-only).
- `src/mocks/uiShellData.ts` (base fake central).
- `src/mocks/uiShellUtils.ts` (utilitários de mocking).

## Rotas e telas preservadas visualmente

- Rotas principais de app e admin continuam renderizando pela estrutura atual de `src/App.tsx`.
- Fluxo visual de login foi preservado e continua como landing para rotas protegidas quando não autenticado.
- Páginas de dashboard, perfil, settings, listagens, comunicados, equipes e módulos admin permanecem navegáveis com dados mockados.

## Verificação executada

- Build executado com sucesso: `npm run build`.
- Sem erros de lint nos arquivos alterados.
