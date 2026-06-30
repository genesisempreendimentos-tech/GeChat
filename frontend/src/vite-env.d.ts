/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Slug do app GêChat na tabela `apps` para auditoria (padrão: `gechat`). */
  readonly VITE_GECHAT_AUDIT_SLUG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '@/assets/audit-log' {
  export function initGeChatAudit(): (() => void) | undefined
  export function emitGeChatAuditAppLogin(userId: string, email?: string): Promise<void>
}
