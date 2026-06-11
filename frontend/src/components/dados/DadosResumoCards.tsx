import {
  CalendarCheck,
  CreditCard,
  HandCoins,
  Inbox,
  MessageSquare,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { DadosDiagnosticoCard } from '@/components/dados/DadosDiagnosticoCard';
import { SaudePeriodoStrip } from '@/components/dados/SaudePeriodoStrip';
import { InfoBox } from '@/components/ui/infoboxes';
import type { LeadsBalanceComparison } from '@/components/charts/Balance';
import { buildDiagnosticoRapido } from '@/lib/dadosDiagnostico';
import type { LeadMetricsRow, LeadsInfoboxStats } from '@/lib/leadsMetrics';
import { LEADS_METRIC_TOOLTIPS } from '@/lib/leadsMetricTooltips';
import { useMemo } from 'react';

type BalanceCtx = {
  comparison: LeadsBalanceComparison;
  deltas: {
    leads: number;
    qualificados: number;
    taxaConversaoPct: number;
    forms: number;
    whatsapp: number;
    atendimentoCorretor: number;
    visitasAgendadas: number;
    analiseCredito: number;
    vendas: number;
  };
} | null;

type DadosResumoCardsProps = {
  stats: LeadsInfoboxStats;
  rows: LeadMetricsRow[];
  balanceCtx: BalanceCtx;
};

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>
  );
}

export function DadosResumoCards({ stats, rows, balanceCtx }: DadosResumoCardsProps) {
  const diagnostico = useMemo(() => buildDiagnosticoRapido(rows, stats), [rows, stats]);

  return (
    <div className="flex flex-col gap-6">
      <SaudePeriodoStrip stats={stats} rows={rows} />

      <div className="flex flex-col gap-4">
        <SectionLabel>Marketing</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InfoBox
            motionIndex={1}
            title="Leads captados"
            value={stats.leads}
            balanceDelta={balanceCtx?.deltas.leads}
            balanceComparison={balanceCtx?.comparison}
            icon={<Users />}
            cor="emerald"
            infoTooltip={LEADS_METRIC_TOOLTIPS.leads}
          />
          <InfoBox
            motionIndex={2}
            title="Conversão visitante → lead"
            value={`${stats.taxaConversaoPct}%`}
            balanceDelta={balanceCtx?.deltas.taxaConversaoPct}
            balanceComparison={balanceCtx?.comparison}
            balanceFormat="percent-points"
            icon={<Sparkles />}
            cor="violet"
            infoTooltip={LEADS_METRIC_TOOLTIPS.conversaoVisitanteLead}
          />
          <InfoBox
            motionIndex={3}
            title="Leads qualificados"
            value={stats.qualificados}
            balanceDelta={balanceCtx?.deltas.qualificados}
            balanceComparison={balanceCtx?.comparison}
            icon={<Star />}
            cor="amber"
            infoTooltip={LEADS_METRIC_TOOLTIPS.qualificados}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <SectionLabel>Comercial</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <InfoBox
            motionIndex={4}
            title="Leads recebidos"
            value={stats.leads}
            balanceDelta={balanceCtx?.deltas.leads}
            balanceComparison={balanceCtx?.comparison}
            icon={<Inbox />}
            cor="blue"
            infoTooltip={LEADS_METRIC_TOOLTIPS.leadsRecebidos}
          />
          <InfoBox
            motionIndex={5}
            title="Em atendimento"
            value={stats.atendimentoCorretor}
            balanceDelta={balanceCtx?.deltas.atendimentoCorretor}
            balanceComparison={balanceCtx?.comparison}
            icon={<MessageSquare />}
            cor="blue"
            infoTooltip={LEADS_METRIC_TOOLTIPS.atendimentoCorretor}
          />
          <InfoBox
            motionIndex={6}
            title="Visitas agendadas"
            value={stats.visitasAgendadas}
            balanceDelta={balanceCtx?.deltas.visitasAgendadas}
            balanceComparison={balanceCtx?.comparison}
            icon={<CalendarCheck />}
            cor="violet"
            infoTooltip={LEADS_METRIC_TOOLTIPS.visitasAgendadas}
          />
          <InfoBox
            motionIndex={7}
            title="Em análise de crédito"
            value={stats.analiseCredito}
            balanceDelta={balanceCtx?.deltas.analiseCredito}
            balanceComparison={balanceCtx?.comparison}
            icon={<CreditCard />}
            cor="muted"
            infoTooltip={LEADS_METRIC_TOOLTIPS.analiseCredito}
          />
          <InfoBox
            motionIndex={8}
            title="Vendas registradas"
            value={stats.vendas}
            balanceDelta={balanceCtx?.deltas.vendas}
            balanceComparison={balanceCtx?.comparison}
            icon={<HandCoins />}
            cor="emerald"
            infoTooltip={LEADS_METRIC_TOOLTIPS.vendas}
          />
        </div>
      </div>

      <DadosDiagnosticoCard messages={diagnostico} motionIndex={9} />
    </div>
  );
}
