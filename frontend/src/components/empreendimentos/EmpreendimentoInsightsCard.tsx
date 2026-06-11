import { Lightbulb } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function EmpreendimentoInsightsCard({ insights }: { insights: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4" />
          Insights por empreendimento
        </CardTitle>
        <CardDescription>Leituras automáticas com base nos dados do período</CardDescription>
      </CardHeader>
      <CardContent>
        {!insights.length ? (
          <p className="py-4 text-sm text-muted-foreground">
            Sem insights automáticos para o período selecionado.
          </p>
        ) : (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {insights.map((insight) => (
              <li key={insight} className="flex gap-2">
                <span className="text-primary">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
