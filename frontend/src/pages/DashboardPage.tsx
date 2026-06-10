import { LayoutDashboard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { MainViewHeader } from '@/components/layout/header';
import { MotionReveal } from '@/components/motion/AppMotion';

export default function DashboardPage() {
  return (
    <MainViewFluidShell>
      <MainViewHeader
        icon={<LayoutDashboard className="h-6 w-6" />}
        title="Dashboard"
        description="Visão geral do seu workspace — em breve, widgets personalizados e resumos do sistema"
      />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <MotionReveal index={0}>
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Em breve</CardTitle>
              <CardDescription>Resumo do seu perfil e atividade recente</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Esta área será expandida com widgets configuráveis.
            </CardContent>
          </Card>
        </MotionReveal>
        <MotionReveal index={1}>
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Em breve</CardTitle>
              <CardDescription>Atalhos e notificações</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Acesso rápido às áreas mais usadas do GêLeads.
            </CardContent>
          </Card>
        </MotionReveal>
        <MotionReveal index={2} className="sm:col-span-2 lg:col-span-1">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Em breve</CardTitle>
              <CardDescription>Integrações e status das fontes de leads</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Métricas gerais ficam em Análise; gestão de leads em Leads.
            </CardContent>
          </Card>
        </MotionReveal>
      </div>
    </MainViewFluidShell>
  );
}
