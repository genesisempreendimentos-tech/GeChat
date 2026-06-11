import { AlertTriangle, Award, BarChart3, TrendingUp } from 'lucide-react';
import { EmpreendimentoBrandIcon } from '@/components/empreendimentos/EmpreendimentoBrandIcon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EmpreendimentoDestaque } from '@/lib/empreendimentosMetrics';

const ICONS = {
  volume: BarChart3,
  qualidade: Award,
  avanco: TrendingUp,
  gargalo: AlertTriangle,
} as const;

type EmpreendimentoDestaqueCardsProps = {
  destaques: EmpreendimentoDestaque[];
  onSelect?: (empreendimentoId: string) => void;
};

export function EmpreendimentoDestaqueCards({
  destaques,
  onSelect,
}: EmpreendimentoDestaqueCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {destaques.map((item) => {
        const Icon = ICONS[item.tipo];
        const clickable = Boolean(onSelect && item.empreendimentoId);

        const content = (
          <>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Icon className="h-4 w-4" />
                {item.titulo}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <EmpreendimentoBrandIcon
                  pagina={item.empreendimentoId}
                  name={item.empreendimento}
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground" title={item.empreendimento}>
                    {item.empreendimento}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.detalhe}</p>
                </div>
              </div>
            </CardContent>
          </>
        );

        if (!clickable) {
          return <Card key={item.tipo}>{content}</Card>;
        }

        return (
          <button
            key={item.tipo}
            type="button"
            onClick={() => onSelect?.(item.empreendimentoId)}
            className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
          >
            <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
              {content}
            </Card>
          </button>
        );
      })}
    </div>
  );
}
