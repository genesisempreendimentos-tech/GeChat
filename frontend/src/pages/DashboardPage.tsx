import { LayoutDashboard } from 'lucide-react';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { MainViewHeader } from '@/components/layout/header';
import { DashboardView } from '@/views/dashboard/DashboardView';

export default function DashboardPage() {
  return (
    <MainViewFluidShell>
      <MainViewHeader
        icon={<LayoutDashboard className="h-6 w-6" />}
        title="Dashboard"
        description="Visão geral do seu workspace — métricas, pipeline e atalhos rápidos"
      />
      <div className="mt-8">
        <DashboardView />
      </div>
    </MainViewFluidShell>
  );
}
