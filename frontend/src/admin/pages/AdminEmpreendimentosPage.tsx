import { useCallback, useEffect, useState } from 'react';
import { EmpreendimentoFormModal } from '@/components/empreendimentos/EmpreendimentoFormModal';
import { EmpreendimentosPanelView } from '@/components/empreendimentos/EmpreendimentosPanelView';
import { fetchAdminEmpreendimentos } from '@/services/empreendimentosService';
import type { EmpreendimentoGenesis } from '@/types/empreendimentos';

export default function AdminEmpreendimentosPage() {
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoGenesis[]>([]);
  const [pendingAliases, setPendingAliases] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmpreendimentoGenesis | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchAdminEmpreendimentos();
    if (!error && data) {
      setEmpreendimentos(data.empreendimentos ?? []);
      setPendingAliases(data.stats?.a_classificar ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <>
      <EmpreendimentosPanelView
        mode="admin"
        empreendimentos={empreendimentos}
        loading={loading}
        pendingAliases={pendingAliases}
        onAdd={() => {
          setEditing(null);
          setModalOpen(true);
        }}
        onEdit={(item) => {
          setEditing(item);
          setModalOpen(true);
        }}
        onRefresh={loadData}
      />
      <EmpreendimentoFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editing={editing}
        allEmpreendimentos={empreendimentos}
        onSaved={loadData}
      />
    </>
  );
}
