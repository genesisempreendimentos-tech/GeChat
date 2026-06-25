/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Slug do app GêNovo na tabela `apps` para auditoria (padrão: `genovo`). */
  readonly VITE_GENOVO_AUDIT_SLUG?: string
  /** @deprecated use VITE_GENOVO_AUDIT_SLUG */
  readonly VITE_GELEADS_AUDIT_SLUG?: string
  /** @deprecated use VITE_GENOVO_AUDIT_SLUG */
  readonly VITE_GEADS_AUDIT_SLUG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '@/assets/audit-log' {
  export function initGeNovoAudit(): (() => void) | undefined
  export function emitGeNovoAuditAppLogin(userId: string, email?: string): Promise<void>
  /** @deprecated use initGeNovoAudit */
  export function initGeLeadsAudit(): (() => void) | undefined
  /** @deprecated use emitGeNovoAuditAppLogin */
  export function emitGeLeadsAuditAppLogin(userId: string, email?: string): Promise<void>
  /** @deprecated use initGeNovoAudit */
  export function initGeAdsAudit(): (() => void) | undefined
  /** @deprecated use emitGeNovoAuditAppLogin */
  export function emitGeAdsAuditAppLogin(userId: string, email?: string): Promise<void>
}
