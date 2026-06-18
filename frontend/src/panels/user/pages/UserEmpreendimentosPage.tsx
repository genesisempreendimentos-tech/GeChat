import { useCallback, useEffect, useState } from 'react';
import { EmpreendimentosPanelView } from '@/components/empreendimentos/EmpreendimentosPanelView';
import { fetchUserEmpreendimentos } from '@/services/empreendimentosService';
import type { EmpreendimentoGenesis } from '@/types/empreendimentos';

export default function UserEmpreendimentosPage() {
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoGenesis[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchUserEmpreendimentos();
    if (!error && data) setEmpreendimentos(data.empreendimentos ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <EmpreendimentosPanelView mode="user" empreendimentos={empreendimentos} loading={loading} />
  );
}
