import { AlertTriangle, Award, BarChart3, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EmpreendimentoDestaque } from '@/lib/empreendimentosMetrics';

const ICONS = {
  volume: BarChart3,
  qualidade: Award,
  avanco: TrendingUp,
  gargalo: AlertTriangle,
} as const;

export function EmpreendimentoDestaqueCards({ destaques }: { destaques: EmpreendimentoDestaque[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {destaques.map((item) => {
        const Icon = ICONS[item.tipo];
        return (
          <Card key={item.tipo}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Icon className="h-4 w-4" />
                {item.titulo}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="truncate font-semibold text-foreground" title={item.empreendimento}>
                {item.empreendimento}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{item.detalhe}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
