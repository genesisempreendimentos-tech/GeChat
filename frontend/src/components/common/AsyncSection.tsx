import type { ReactNode } from 'react';
import { PageEmptyState, PageErrorState } from '@/components/common/PageStates';

export type AsyncSectionProps = {
  loading: boolean;
  error?: string | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  emptyState?: ReactNode;
  errorState?: ReactNode;
  skeleton?: ReactNode;
  children: ReactNode;
};

/**
 * Padroniza loading / error / empty de uma região de conteúdo.
 * Passe `errorState`, `emptyState` ou `skeleton` para customizar; omita para usar defaults.
 * Quando `skeleton` é omitido e `loading` é true, renderiza `children` (útil se os filhos
 * tratam skeleton internamente).
 */
export function AsyncSection({
  loading,
  error,
  isEmpty = false,
  onRetry,
  emptyState,
  errorState,
  skeleton,
  children,
}: AsyncSectionProps) {
  if (error) {
    if (errorState !== undefined) {
      return <>{errorState}</>;
    }
    return <PageErrorState message={error} onRetry={onRetry} />;
  }

  if (isEmpty && !loading) {
    if (emptyState !== undefined) {
      return <>{emptyState}</>;
    }
    return <PageEmptyState />;
  }

  if (loading) {
    if (skeleton !== undefined) {
      return <>{skeleton}</>;
    }
    return <>{children}</>;
  }

  return <>{children}</>;
}
