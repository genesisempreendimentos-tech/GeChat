/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** Slug do app GeNovo na tabela `apps` para auditoria (padrao: `genovo`). */
  readonly VITE_GENOVO_AUDIT_SLUG?: string
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
  export function initGeNovoAudit(): (() => void) | undefined
  export function emitGeNovoAuditAppLogin(userId: string, email?: string): Promise<void>
}
