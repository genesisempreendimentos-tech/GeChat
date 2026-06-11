import { Users } from 'lucide-react';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { MainViewHeader } from '@/components/layout/header';
import { LeadsOperacionalView } from '@/views/leads/LeadsOperacionalView';
import { CvcrmPendingSyncButton } from '@/components/cvcrm/CvcrmPendingSyncButton';
import { useLeadsData } from '@/hooks/useLeadsData';

export default function LeadsPage() {
  const { refreshFromDatabase } = useLeadsData();

  return (
    <MainViewFluidShell>
      <MainViewHeader
        icon={<Users className="h-6 w-6" />}
        title="Leads"
        description="Gestão operacional — busca, planilha, cards e resumo individual por lead"
        button={<CvcrmPendingSyncButton onSynced={() => void refreshFromDatabase()} />}
      />
      <div className="mt-8">
        <LeadsOperacionalView />
      </div>
    </MainViewFluidShell>
  );
}
