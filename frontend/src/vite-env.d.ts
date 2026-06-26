/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Slug do app GêChat na tabela `apps` para auditoria (padrão: `gechat`). */
  readonly VITE_GECHAT_AUDIT_SLUG?: string
  /** @deprecated use VITE_GECHAT_AUDIT_SLUG */
  readonly VITE_GENOVO_AUDIT_SLUG?: string
  /** @deprecated use VITE_GECHAT_AUDIT_SLUG */
  readonly VITE_GELEADS_AUDIT_SLUG?: string
  /** @deprecated use VITE_GECHAT_AUDIT_SLUG */
  readonly VITE_GEADS_AUDIT_SLUG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '@/assets/audit-log' {
  export function initGeChatAudit(): (() => void) | undefined
  export function emitGeChatAuditAppLogin(userId: string, email?: string): Promise<void>
  /** @deprecated use initGeChatAudit */
  export function initGeNovoAudit(): (() => void) | undefined
  /** @deprecated use emitGeChatAuditAppLogin */
  export function emitGeNovoAuditAppLogin(userId: string, email?: string): Promise<void>
  /** @deprecated use initGeChatAudit */
  export function initGeLeadsAudit(): (() => void) | undefined
  /** @deprecated use emitGeChatAuditAppLogin */
  export function emitGeLeadsAuditAppLogin(userId: string, email?: string): Promise<void>
  /** @deprecated use initGeChatAudit */
  export function initGeAdsAudit(): (() => void) | undefined
  /** @deprecated use emitGeChatAuditAppLogin */
  export function emitGeAdsAuditAppLogin(userId: string, email?: string): Promise<void>
}
