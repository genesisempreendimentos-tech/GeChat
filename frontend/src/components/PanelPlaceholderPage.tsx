import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type PanelName = 'User' | 'Vitrine' | 'Admin';

interface PanelPlaceholderPageProps {
  title: string;
  description?: string;
  panelName?: PanelName;
}

export default function PanelPlaceholderPage({
  title,
  description,
  panelName = 'User',
}: PanelPlaceholderPageProps) {
  const defaultDescription =
    panelName === 'User'
      ? 'Painel User — adicione seus módulos e funcionalidades aqui.'
      : panelName === 'Vitrine'
        ? 'Painel Vitrine — protótipo de referência para novos módulos.'
        : 'Painel Admin — configure usuários, permissões e configurações do workspace.';

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg border-border/70 bg-card/80 shadow-lg backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description ?? defaultDescription}</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Módulo em construção. Use o menu lateral para navegar entre as seções.
        </CardContent>
      </Card>
    </div>
  );
}
