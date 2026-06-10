import { FileBarChart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { MainViewHeader } from '@/components/layout/header';
import { MotionReveal } from '@/components/motion/AppMotion';

export default function RelatoriosPage() {
  return (
    <MainViewFluidShell>
      <MainViewHeader
        icon={<FileBarChart className="h-6 w-6" />}
        title="Relatórios"
        description="Exportações, resumos periódicos e documentos consolidados dos seus leads"
      />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <MotionReveal index={0}>
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Em breve</CardTitle>
              <CardDescription>Relatórios exportáveis</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Geração de PDF e planilhas com métricas e listagens filtradas.
            </CardContent>
          </Card>
        </MotionReveal>
        <MotionReveal index={1}>
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Em breve</CardTitle>
              <CardDescription>Resumos periódicos</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Visões semanais e mensais para acompanhar evolução e metas.
            </CardContent>
          </Card>
        </MotionReveal>
        <MotionReveal index={2} className="sm:col-span-2 lg:col-span-1">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Em breve</CardTitle>
              <CardDescription>Modelos personalizados</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Combine blocos de Análise e Leads em relatórios sob medida para sua equipe.
            </CardContent>
          </Card>
        </MotionReveal>
      </div>
    </MainViewFluidShell>
  );
}
