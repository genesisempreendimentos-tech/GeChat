import { useCallback, useEffect, useState } from 'react';
import { fetchNotificacoes, marcarNotificacoesLidas } from '@/services/notificacoesService';
import type { NotificacoesResponse } from '@/types/historico';

export function useNotificacoes(limit = 20) {
  const [data, setData] = useState<NotificacoesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: payload, error: fetchError } = await fetchNotificacoes(limit);
    if (fetchError) {
      setError(fetchError);
      setData(null);
    } else {
      setData(payload);
    }
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const marcarLidas = useCallback(async () => {
    const { error: markError } = await marcarNotificacoesLidas();
    if (markError) {
      setError(markError);
      return false;
    }
    await load();
    return true;
  }, [load]);

  return {
    data,
    loading,
    error,
    naoLidas: data?.nao_lidas ?? 0,
    items: data?.items ?? [],
    reload: load,
    marcarLidas,
  };
}
