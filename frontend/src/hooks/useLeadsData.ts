import { useCallback, useEffect } from 'react';
import type { LeadRow } from '@/lib/leadRow';
import { useLeadsStore } from '@/store/leadsStore';

type UseLeadsDataResult = {
  rows: LeadRow[];
  loading: boolean;
  /** Progresso real do download dos leads (0–100). */
  progress: number;
  syncing: boolean;
  error: string | null;
  refetch: () => void;
  refreshFromDatabase: () => Promise<void>;
};

/**
 * Leads compartilhados entre páginas via leadsStore: a primeira página que
 * montar dispara a carga; as demais reutilizam o cache (navegar não recarrega).
 */
export function useLeadsData(): UseLeadsDataResult {
  const rows = useLeadsStore((s) => s.rows);
  const loaded = useLeadsStore((s) => s.loaded);
  const loading = useLeadsStore((s) => s.loading);
  const progress = useLeadsStore((s) => s.progress);
  const syncing = useLeadsStore((s) => s.syncing);
  const error = useLeadsStore((s) => s.error);
  const fetchLeads = useLeadsStore((s) => s.fetchLeads);
  const refreshFromDatabase = useLeadsStore((s) => s.refreshFromDatabase);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  const refetch = useCallback(() => {
    void fetchLeads({ force: true });
  }, [fetchLeads]);

  return {
    rows,
    // Antes da primeira carga concluir, trate como carregando (sem flash de tela vazia).
    loading: loading || (!loaded && !error),
    progress,
    syncing,
    error,
    refetch,
    refreshFromDatabase,
  };
}
