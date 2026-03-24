/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Slug do app GeApps na tabela `apps` para auditoria (padrão: `geapps`). */
  readonly VITE_GEAPPS_AUDIT_SLUG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.svg' {
  const content: string
  export default content
}

declare module '*.png' {
  const content: string
  export default content
}

declare module '*.jpg' {
  const content: string
  export default content
}

declare module '*.jpeg' {
  const content: string
  export default content
}

declare module '*.gif' {
  const content: string
  export default content
}

declare module '*.webp' {
  const content: string
  export default content
}

declare module '@/assets/audit-log' {
  export function initGeAppsAudit(): () => void
  export function emitGeAppsAuditAppLogin(userId: string, email: string): Promise<void>
}
