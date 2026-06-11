import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  HandCoins,
  Lightbulb,
  MapPin,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { EmpreendimentoBrandIcon } from '@/components/empreendimentos/EmpreendimentoBrandIcon';
import { EmpreendimentoStatusBadge } from '@/components/empreendimentos/EmpreendimentoStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoBox } from '@/components/ui/infoboxes';
import {
  buildSingleEmpreendimentoInsights,
  getBaseMaturacaoStatus,
  getOrigemBreakdown,
  type EmpreendimentoMetrics,
} from '@/lib/empreendimentosMetrics';
import { cn } from '@/lib/utils';

type EmpreendimentoDetailPanelProps = {
  metric: EmpreendimentoMetrics;
  onBack: () => void;
};

function formatPct(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function MetricBar({
  label,
  value,
  total,
  colorClass,
}: {
  label: string;
  value: number;
  total: number;
  colorClass: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground">
          {value.toLocaleString('pt-BR')}
          <span className="ml-1.5 text-xs text-muted-foreground">({formatPct(pct)})</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted/60">
        <div
          className={cn('h-full rounded-full transition-all', colorClass)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

const MATURACAO_STATUS_CLASS: Record<ReturnType<typeof getBaseMaturacaoStatus>, string> = {
  Saudável: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  Atenção: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  Envelhecida: 'bg-orange-500/15 text-orange-800 dark:text-orange-200',
  Crítica: 'bg-red-500/15 text-red-700 dark:text-red-300',
};

export function EmpreendimentoDetailPanel({ metric, onBack }: EmpreendimentoDetailPanelProps) {
  const insights = buildSingleEmpreendimentoInsights(metric);
  const origemItems = getOrigemBreakdown(metric.origem);
  const maturacaoStatus = getBaseMaturacaoStatus(metric.percentual61Mais);
  const hasGargalo = metric.principalGargalo !== 'Sem gargalo crítico';

  return (
    <div className="space-y-6">
      <Button type="button" variant="ghost" className="rounded-xl gap-2 -ml-2" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
        Todos os empreendimentos
      </Button>

      <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <EmpreendimentoBrandIcon
            pagina={metric.empreendimentoId}
            name={metric.empreendimentoNome}
            size="lg"
            className="h-20 w-20 p-3"
          />
          <div className="min-w-0 space-y-2">
            <h2 className="truncate text-xl font-semibold text-foreground" title={metric.empreendimentoNome}>
              {metric.empreendimentoNome}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <EmpreendimentoStatusBadge status={metric.status} />
              <span className="text-sm text-muted-foreground">
                {formatPct(metric.percentualDoTotal)} do total de leads
              </span>
            </div>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-3xl font-bold tabular-nums text-foreground">
            {metric.leads.toLocaleString('pt-BR')}
          </p>
          <p className="text-sm text-muted-foreground">leads no período</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <InfoBox
          title="Leads"
          value={metric.leads.toLocaleString('pt-BR')}
          icon={<Users className="h-4 w-4" />}
          cor="blue"
          motionIndex={0}
        />
        <InfoBox
          title="Qualificados"
          value={`${metric.qualificados.toLocaleString('pt-BR')} (${formatPct(metric.taxaQualificacao)})`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          cor="violet"
          motionIndex={1}
        />
        <InfoBox
          title="Atendimento"
          value={`${metric.atendimento.toLocaleString('pt-BR')} (${formatPct(metric.taxaAtendimento)})`}
          icon={<ClipboardList className="h-4 w-4" />}
          cor="blue"
          motionIndex={2}
        />
        <InfoBox
          title="Visitas"
          value={`${metric.visitas.toLocaleString('pt-BR')} (${formatPct(metric.taxaVisitaSobreLeads)})`}
          icon={<MapPin className="h-4 w-4" />}
          cor="amber"
          motionIndex={3}
        />
        <InfoBox
          title="Crédito"
          value={`${metric.credito.toLocaleString('pt-BR')} (${formatPct(metric.taxaCreditoSobreVisitas)})`}
          icon={<HandCoins className="h-4 w-4" />}
          cor="violet"
          motionIndex={4}
        />
        <InfoBox
          title="Vendas"
          value={`${metric.vendas.toLocaleString('pt-BR')} (${formatPct(metric.taxaVendaSobreLeads)})`}
          icon={<ShoppingBag className="h-4 w-4" />}
          cor="emerald"
          motionIndex={5}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Qualificação</CardTitle>
            <CardDescription>Distribuição por nível de qualificação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MetricBar label="Alta" value={metric.alta} total={metric.leads} colorClass="bg-emerald-500" />
            <MetricBar label="Média" value={metric.media} total={metric.leads} colorClass="bg-blue-500" />
            <MetricBar label="Baixa" value={metric.baixa} total={metric.leads} colorClass="bg-amber-500" />
            <MetricBar
              label="Indefinida"
              value={metric.indefinida}
              total={metric.leads}
              colorClass="bg-slate-400"
            />
            {metric.taxaIndefinida >= 50 ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                Mais da metade dos leads está sem qualificação.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" />
              Maturação
            </CardTitle>
            <CardDescription>Idade dos leads em aberto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Em aberto</span>
              <span className="font-semibold tabular-nums">{metric.emAberto.toLocaleString('pt-BR')}</span>
            </div>
            {metric.emAberto > 0 ? (
              <>
                <MetricBar label="0–7 dias" value={metric.leads0a7} total={metric.emAberto} colorClass="bg-emerald-500" />
                <MetricBar label="8–15 dias" value={metric.leads8a15} total={metric.emAberto} colorClass="bg-teal-500" />
                <MetricBar label="16–30 dias" value={metric.leads16a30} total={metric.emAberto} colorClass="bg-blue-500" />
                <MetricBar label="31–60 dias" value={metric.leads31a60} total={metric.emAberto} colorClass="bg-amber-500" />
                <MetricBar label="61+ dias" value={metric.leads61Mais} total={metric.emAberto} colorClass="bg-red-500" />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm text-muted-foreground">Status da base</span>
                  <span
                    className={cn(
                      'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                      MATURACAO_STATUS_CLASS[maturacaoStatus],
                    )}
                  >
                    {maturacaoStatus}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum lead em aberto no período.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Origem dos leads</CardTitle>
          <CardDescription>Canais de captação no período</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!origemItems.length ? (
            <p className="text-sm text-muted-foreground">Sem dados de origem.</p>
          ) : (
            origemItems.map((item, index) => (
              <MetricBar
                key={item.bucket}
                label={item.label}
                value={item.count}
                total={metric.leads}
                colorClass={
                  ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-cyan-500', 'bg-orange-500'][
                    index % 6
                  ]!
                }
              />
            ))
          )}
        </CardContent>
      </Card>

      {hasGargalo ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-900 dark:text-amber-100">
              <AlertTriangle className="h-4 w-4" />
              Principal gargalo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium text-foreground">{metric.principalGargalo}</p>
          </CardContent>
        </Card>
      ) : null}

      {insights.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4" />
              Insights
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
      ) : null}
    </div>
  );
}
