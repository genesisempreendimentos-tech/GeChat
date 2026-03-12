import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export function ProfilePreferencesTab() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Preferências
        </CardTitle>
        <CardDescription>
          Configure preferências de exibição e notificações. Em breve mais opções.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          As preferências do aplicativo podem ser ajustadas na página de Configurações.
        </p>
      </CardContent>
    </Card>
  );
}
