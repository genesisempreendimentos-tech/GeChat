import { Users } from 'lucide-react';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { MainViewHeader } from '@/components/layout/header';
import { LeadsOperacionalView } from '@/views/leads/LeadsOperacionalView';

export default function LeadsPage() {
  return (
    <MainViewFluidShell>
      <MainViewHeader
        icon={<Users className="h-6 w-6" />}
        title="Leads"
        description="Gestão operacional — busca, planilha, cards e resumo individual por lead"
      />
      <div className="mt-8">
        <LeadsOperacionalView />
      </div>
    </MainViewFluidShell>
  );
}
