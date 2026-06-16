/**
 * Módulo Vitrine — painel de referência/brainstorm (descartável).
 *
 * Para remover no futuro:
 * 1. Delete a pasta `panels/vitrine/`
 * 2. Remova as rotas Vitrine e `vitrineLegacyRedirectRoutes` em `App.tsx`
 * 3. Remova a opção "Vitrine" do switcher em `AppBrandHeader.tsx`
 *
 * Componentes compartilhados (`components/ui`, `components/layout`, `pages/*`) permanecem intactos.
 */
export { default as VitrineLayout } from './VitrineLayout';
export { default as VitrineSidebar } from './VitrineSidebar';
export { vitrineLegacyRedirectRoutes } from './legacyRedirects';
