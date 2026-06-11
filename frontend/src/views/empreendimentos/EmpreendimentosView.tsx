import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmpreendimentoDestaqueCards } from '@/components/empreendimentos/EmpreendimentoDestaqueCards';
import { EmpreendimentoDetailPanel } from '@/components/empreendimentos/EmpreendimentoDetailPanel';
import { EmpreendimentoPickerGrid } from '@/components/empreendimentos/EmpreendimentoPickerGrid';
import { EmpreendimentoResumoCards } from '@/components/empreendimentos/EmpreendimentoResumoCards';
import { LeadsLoadingProgress } from '@/components/LeadsLoadingProgress';
import { MotionReveal } from '@/components/motion/AppMotion';
import {
  computeEmpreendimentoDestaques,
  computeEmpreendimentoResumoCards,
  hasLeadsSemEmpreendimento,
} from '@/lib/empreendimentosMetrics';
import { filterMetricsForEmpreendimentoSelection, type EmpreendimentosFilters } from '@/lib/empreendimentosFilters';
import { useLeadsData } from '@/hooks/useLeadsData';

export type EmpreendimentosViewProps = {
  filtros: EmpreendimentosFilters;
};

export function EmpreendimentosView({ filtros }: EmpreendimentosViewProps) {
  const { rows: allRows, loading, progress, error } = useLeadsData();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { filteredRows, metrics } = useMemo(
    () => filterMetricsForEmpreendimentoSelection(allRows, filtros),
    [allRows, filtros],
  );

  const resumoCards = useMemo(() => computeEmpreendimentoResumoCards(metrics), [metrics]);
  const destaques = useMemo(() => computeEmpreendimentoDestaques(metrics), [metrics]);

  const selectedMetric = useMemo(
    () => metrics.find((m) => m.empreendimentoId === selectedId) ?? null,
    [metrics, selectedId],
  );

  useEffect(() => {
    setSelectedId(null);
  }, [filtros]);

  useEffect(() => {
    if (selectedId && !selectedMetric) {
      setSelectedId(null);
    }
  }, [selectedId, selectedMetric]);

  const showSemEmpreendimento = useMemo(
    () => hasLeadsSemEmpreendimento(filteredRows),
    [filteredRows],
  );

  if (loading) {
    return <LeadsLoadingProgress progress={progress} />;
  }

  if (error) {
    return (
      <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (!filteredRows.length) {
    return (
      <p className="rounded-xl border border-border/70 bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
        Nenhum lead encontrado para os filtros selecionados.
      </p>
    );
  }

  if (selectedMetric) {
    return (
      <EmpreendimentoDetailPanel
        metric={selectedMetric}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {showSemEmpreendimento ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Existem leads sem empreendimento associado. Verifique o preenchimento do formulário ou
          integração com o CRM.
        </div>
      ) : null}

      <MotionReveal>
        <EmpreendimentoResumoCards cards={resumoCards} />
      </MotionReveal>

      <MotionReveal index={1}>
        <EmpreendimentoDestaqueCards
          destaques={destaques}
          onSelect={(id) => {
            if (id) setSelectedId(id);
          }}
        />
      </MotionReveal>

      <MotionReveal index={2}>
        <EmpreendimentoPickerGrid
          metrics={metrics}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </MotionReveal>
    </div>
  );
}

export function EmpreendimentoPreviewResumo({
  metrics,
}: {
  metrics: ReturnType<typeof filterMetricsForEmpreendimentoSelection>['metrics'];
}) {
  const top3 = metrics.slice(0, 3);
  const resumo = computeEmpreendimentoResumoCards(metrics);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">Empreendimentos</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {top3.map((m) => (
            <li key={m.empreendimentoId}>
              {m.empreendimentoNome}: {m.leads.toLocaleString('pt-BR')} leads
            </li>
          ))}
          <li>
            Total: {resumo.leadsCaptados.toLocaleString('pt-BR')} leads em{' '}
            {resumo.empreendimentosAtivos} produtos
          </li>
        </ul>
      </div>
      <Button asChild variant="outline" className="rounded-xl gap-2 shrink-0">
        <Link to="/empreendimentos">
          Ver empreendimentos completo
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
