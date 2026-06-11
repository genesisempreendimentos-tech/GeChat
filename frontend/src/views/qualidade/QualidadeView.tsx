import { useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
import { HorizontalBarRankChart } from '@/components/dados/DadosCharts';
import { QualidadeGrupoBreakdown } from '@/components/qualidade/QualidadeGrupoBreakdown';
import {
  QualidadeExplainSection,
  QualidadeResumoCards,
} from '@/components/qualidade/QualidadeResumoCards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeadsLoadingProgress } from '@/components/LeadsLoadingProgress';
import { MotionReveal } from '@/components/motion/AppMotion';
import { aggregateByQualificacaoBars } from '@/lib/dadosAggregations';
import { aggregateQualidadeByGrupo } from '@/lib/dadosMaturacao';
import type { DadosFilters } from '@/lib/dadosFilters';
import { resolveEmpreendimentoLabel } from '@/lib/leadEmpreendimento';
import {
  buildQualidadeInsights,
  computeQualidadeResumo,
} from '@/lib/qualidadeMetrics';
import { useFilteredLeadRows } from '@/hooks/useFilteredLeadRows';
import { useLeadsData } from '@/hooks/useLeadsData';

export type QualidadeViewProps = {
  filtros: DadosFilters;
};

export function QualidadeView({ filtros }: QualidadeViewProps) {
  const { rows: allRows, loading, progress, error } = useLeadsData();
  const filteredRows = useFilteredLeadRows(allRows, filtros);

  const resumo = useMemo(() => computeQualidadeResumo(filteredRows), [filteredRows]);
  const qualificacaoBars = useMemo(
    () => aggregateByQualificacaoBars(filteredRows),
    [filteredRows],
  );
  const qualidadePorOrigem = useMemo(
    () => aggregateQualidadeByGrupo(filteredRows, (row) => row.origem || '—'),
    [filteredRows],
  );
  const qualidadePorEmpreendimento = useMemo(
    () => aggregateQualidadeByGrupo(filteredRows, (row) => resolveEmpreendimentoLabel(row)),
    [filteredRows],
  );
  const insights = useMemo(
    () => buildQualidadeInsights(resumo, qualidadePorOrigem, qualidadePorEmpreendimento),
    [resumo, qualidadePorOrigem, qualidadePorEmpreendimento],
  );

  if (loading) {
    return <LeadsLoadingProgress progress={progress} />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!filteredRows.length) {
    return (
      <p className="rounded-xl border border-border/70 bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
        Nenhum lead encontrado para os filtros selecionados.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {resumo.taxaIndefinida >= 50 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {resumo.taxaIndefinida.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% dos leads
          estão sem qualificação. As comparações abaixo podem ficar imprecisas até corrigir a
          captura.
        </div>
      ) : null}

      <MotionReveal>
        <QualidadeResumoCards resumo={resumo} />
      </MotionReveal>

      <MotionReveal index={1}>
        <QualidadeExplainSection />
      </MotionReveal>

      <MotionReveal index={2}>
        <HorizontalBarRankChart
          data={qualificacaoBars}
          title="Distribuição geral"
          description="Como os leads se dividem entre os níveis de qualificação"
          valueLabel="Leads"
        />
      </MotionReveal>

      <MotionReveal index={3}>
        <QualidadeGrupoBreakdown
          rows={qualidadePorOrigem}
          title="Qualidade por origem"
          description="Compare canais de captação e identifique quais trazem leads mais qualificados"
        />
      </MotionReveal>

      <MotionReveal index={4}>
        <QualidadeGrupoBreakdown
          rows={qualidadePorEmpreendimento}
          title="Qualidade por empreendimento"
          description="Veja qual produto atrai leads com melhor perfil no período"
        />
      </MotionReveal>

      {insights.length ? (
        <MotionReveal index={5}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4" />
                Leituras automáticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {insights.map((insight) => (
                  <li key={insight} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </MotionReveal>
      ) : null}
    </div>
  );
}
