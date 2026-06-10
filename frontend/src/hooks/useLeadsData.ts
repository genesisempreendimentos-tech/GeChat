import { useCallback, useEffect, useState } from 'react';
import type { LeadRow } from '@/lib/leadRow';
import { mapLeadToRow } from '@/lib/mapLeadToRow';
import { leadsService } from '@/services/leadsService';

type UseLeadsDataResult = {
  rows: LeadRow[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
  refetch: () => void;
  refreshFromDatabase: () => Promise<void>;
};

export function useLeadsData(): UseLeadsDataResult {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const refreshFromDatabase = useCallback(async () => {
    setSyncing(true);
    const { error: syncError } = await leadsService.sync();
    setSyncing(false);

    if (syncError) {
      setError(typeof syncError === 'string' ? syncError : 'Erro ao sincronizar leads.');
      return;
    }

    refetch();
  }, [refetch]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error: fetchError } = await leadsService.list();
      if (cancelled) return;

      if (fetchError) {
        setError(typeof fetchError === 'string' ? fetchError : 'Erro ao carregar leads.');
        setRows([]);
      } else {
        setRows((data ?? []).map(mapLeadToRow));
        setError(null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return { rows, loading, syncing, error, refetch, refreshFromDatabase };
}
