import { useCallback, useEffect, useState } from 'react';
import { EmpreendimentosPanelView } from '@/components/empreendimentos/EmpreendimentosPanelView';
import { fetchUserEmpreendimentos } from '@/services/empreendimentosService';
import type { EmpreendimentoGenesis, EmpreendimentosDateRange } from '@/types/empreendimentos';

export default function UserEmpreendimentosPage() {
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoGenesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<EmpreendimentosDateRange>({ from: '', to: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchUserEmpreendimentos(dateRange);
    if (!error && data) setEmpreendimentos(data.empreendimentos ?? []);
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <EmpreendimentosPanelView
      mode="user"
      empreendimentos={empreendimentos}
      loading={loading}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    />
  );
}
