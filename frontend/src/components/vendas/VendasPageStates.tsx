import { AlertCircle, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type VendasErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export function VendasErrorState({ message, onRetry }: VendasErrorStateProps) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center sm:flex-row sm:text-left">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Não conseguimos carregar as vendas</p>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
        <Button type="button" variant="outline" className="shrink-0 gap-2 rounded-xl" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  );
}

type VendasEmptyStateProps = {
  onClearFilters?: () => void;
};

export function VendasEmptyState({ onClearFilters }: VendasEmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <TrendingUp className="h-6 w-6" />
        </div>
        <p className="text-lg font-semibold">Sem vendas no período selecionado</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Ajuste o período ou os filtros para ver o diagnóstico da carteira. Vendas efetuadas são
          contadas pela data de venda, independentemente de distrato posterior.
        </p>
        {onClearFilters ? (
          <Button type="button" variant="outline" className="mt-2 rounded-xl" onClick={onClearFilters}>
            Limpar filtros
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
