import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function UserHomePage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg border-border/70 bg-card/80 shadow-lg backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Comece aqui</CardTitle>
          <CardDescription>
            Painel User — construa as telas reais do GêLeads importando componentes e estilos
            compartilhados.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Use o menu lateral para navegar. Troque para a Vitrine pelo logo no topo quando precisar
          consultar o protótipo de referência.
        </CardContent>
      </Card>
    </div>
  );
}
