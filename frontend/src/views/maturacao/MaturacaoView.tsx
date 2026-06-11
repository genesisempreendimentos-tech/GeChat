import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CreditoSituacaoCard,
  IdadeLeadsAbertoCard,
  SafraMaturacaoChart,
  TempoMedioAvancoChart,
} from '@/components/dados/DadosMaturacaoCharts';
import { EmpreendimentoMaturacaoTable } from '@/components/maturacao/EmpreendimentoMaturacaoTable';
import { GargalosPorEtapaTable } from '@/components/maturacao/GargalosPorEtapaTable';
import { LeadsCriticosTable } from '@/components/maturacao/LeadsCriticosTable';
import { MaturacaoResumoCards } from '@/components/maturacao/MaturacaoResumoCards';
import { MotionReveal } from '@/components/motion/AppMotion';
import { LeadsLoadingProgress } from '@/components/LeadsLoadingProgress';
import {
  aggregateCreditoSituacao,
  aggregateEmpreendimentoMaturacao,
  aggregateGargalosPorEtapa,
  aggregateIdadeEmAberto,
  aggregateSafraMaturacao,
  buildLeadsCriticos,
  computeMaturacaoResumoCards,
  computeTempoMedioAvanco,
  hasMaturacaoDateData,
  isLeadCritico,
} from '@/lib/dadosMaturacao';
import { filterMaturacaoRows, type MaturacaoFilters } from '@/lib/maturacaoFilters';
import { useLeadsData } from '@/hooks/useLeadsData';

const CRITICOS_LIMIT = 100;

export type MaturacaoViewProps = {
  filtros: MaturacaoFilters;
};

export function MaturacaoView({ filtros }: MaturacaoViewProps) {
  const { rows: allRows, loading, progress, error } = useLeadsData();

  const filteredRows = useMemo(
    () => filterMaturacaoRows(allRows, filtros),
    [allRows, filtros],
  );

  const resumoCards = useMemo(() => computeMaturacaoResumoCards(filteredRows), [filteredRows]);
  const safraRows = useMemo(() => aggregateSafraMaturacao(filteredRows), [filteredRows]);
  const tempoMedio = useMemo(() => computeTempoMedioAvanco(filteredRows), [filteredRows]);
  const idadeFaixas = useMemo(() => aggregateIdadeEmAberto(filteredRows), [filteredRows]);
  const creditoSituacao = useMemo(() => aggregateCreditoSituacao(filteredRows), [filteredRows]);
  const gargalos = useMemo(() => aggregateGargalosPorEtapa(filteredRows), [filteredRows]);
  const empreendimentoRows = useMemo(
    () => aggregateEmpreendimentoMaturacao(filteredRows),
    [filteredRows],
  );
  const hasMaturacaoDates = useMemo(() => hasMaturacaoDateData(filteredRows), [filteredRows]);

  const criticosTotal = useMemo(
    () => filteredRows.filter((row) => isLeadCritico(row)).length,
    [filteredRows],
  );
  const criticosRows = useMemo(() => buildLeadsCriticos(filteredRows, CRITICOS_LIMIT), [filteredRows]);

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

  return (
    <div className="flex flex-col gap-8">
      <MotionReveal>
        <MaturacaoResumoCards cards={resumoCards} />
      </MotionReveal>

      <MotionReveal index={1}>
        <SafraMaturacaoChart rows={safraRows} hasDateData={hasMaturacaoDates} />
      </MotionReveal>

      <MotionReveal index={2}>
        <TempoMedioAvancoChart items={tempoMedio} hasDateData={hasMaturacaoDates} />
      </MotionReveal>

      <div className="grid gap-6 lg:grid-cols-2">
        <MotionReveal index={3}>
          <IdadeLeadsAbertoCard faixas={idadeFaixas} />
        </MotionReveal>
        <MotionReveal index={4}>
          <GargalosPorEtapaTable rows={gargalos} />
        </MotionReveal>
      </div>

      <MotionReveal index={5}>
        <CreditoSituacaoCard situacao={creditoSituacao} />
      </MotionReveal>

      <MotionReveal index={6}>
        <EmpreendimentoMaturacaoTable rows={empreendimentoRows} />
      </MotionReveal>

      <MotionReveal index={7}>
        <LeadsCriticosTable rows={criticosRows} totalCount={criticosTotal} />
      </MotionReveal>
    </div>
  );
}

export function MaturacaoPreviewResumo({ rows }: { rows: ReturnType<typeof useLeadsData>['rows'] }) {
  const cards = useMemo(() => computeMaturacaoResumoCards(rows), [rows]);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">Maturação</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>Leads em aberto: {cards.leadsEmAberto.toLocaleString('pt-BR')}</li>
          <li>31+ dias: {cards.dias31Plus.toLocaleString('pt-BR')}</li>
          <li>61+ dias: {cards.dias61Plus.toLocaleString('pt-BR')}</li>
          <li>Leads parados: {cards.leadsParados.toLocaleString('pt-BR')}</li>
        </ul>
      </div>
      <Button asChild variant="outline" className="rounded-xl gap-2 shrink-0">
        <Link to="/maturacao">
          Ver maturação completa
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
