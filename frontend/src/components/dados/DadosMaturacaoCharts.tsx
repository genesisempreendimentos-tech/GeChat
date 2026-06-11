import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useThemeStore } from '@/store/themeStore';
import {
  getEtapaStackColor,
  type CreditoSituacao,
  type IdadeFaixaItem,
  type SafraMaturacaoRow,
  type TempoMedioItem,
} from '@/lib/dadosMaturacao';

function useIsDark() {
  const { theme } = useThemeStore();
  return theme === 'dark' || theme === 'full-dark';
}

function MaturacaoEmptyState({ message }: { message: string }) {
  return (
    <p className="py-12 text-center text-sm text-muted-foreground">{message}</p>
  );
}

const SAFRA_LEGEND: { key: string; label: string }[] = [
  { key: 'atendimento', label: 'Em atendimento' },
  { key: 'visita', label: 'Visita' },
  { key: 'credito', label: 'Análise de crédito' },
  { key: 'venda', label: 'Venda' },
  { key: 'perdido', label: 'Perdido / encerrado' },
  { key: 'emAberto', label: 'Sem avanço / aberto' },
];

function SafraLegend() {
  return (
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
      {SAFRA_LEGEND.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: getEtapaStackColor(key) }}
          />
          {label}
        </div>
      ))}
    </div>
  );
}

export function SafraMaturacaoChart({
  rows,
  hasDateData,
}: {
  rows: SafraMaturacaoRow[];
  hasDateData: boolean;
}) {
  const isDark = useIsDark();

  if (!rows.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Maturação por safra de leads</CardTitle>
          <CardDescription>Etapa atual dos leads captados em cada mês</CardDescription>
        </CardHeader>
        <CardContent>
          <MaturacaoEmptyState message="Sem dados de safra no período" />
        </CardContent>
      </Card>
    );
  }

  const chartData = rows.map((r) => ({
    safra: r.safra,
    Atendimento: r.atendimento,
    Visita: r.visita,
    Crédito: r.credito,
    Venda: r.venda,
    Perdido: r.perdido,
    'Em aberto': r.emAberto,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Maturação por safra de leads</CardTitle>
        <CardDescription>Etapa atual dos leads captados em cada mês</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasDateData ? (
          <p className="mb-4 text-xs text-muted-foreground">
            Etapas calculadas a partir dos campos de estágio e status dos leads. As datas de
            transição aparecem conforme o CVCRM atualizar cada registro.
          </p>
        ) : null}
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
            <XAxis dataKey="safra" stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={11} />
            <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={11} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                borderRadius: '0.5rem',
              }}
            />
            <Bar dataKey="Atendimento" stackId="a" fill={getEtapaStackColor('atendimento')} />
            <Bar dataKey="Visita" stackId="a" fill={getEtapaStackColor('visita')} />
            <Bar dataKey="Crédito" stackId="a" fill={getEtapaStackColor('credito')} />
            <Bar dataKey="Venda" stackId="a" fill={getEtapaStackColor('venda')} />
            <Bar dataKey="Perdido" stackId="a" fill={getEtapaStackColor('perdido')} />
            <Bar dataKey="Em aberto" stackId="a" fill={getEtapaStackColor('emAberto')} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <SafraLegend />
      </CardContent>
    </Card>
  );
}

const TEMPO_EMPTY_MESSAGES: Record<string, string> = {
  'Lead → Atendimento': 'aguardando dados',
  'Lead → Visita': 'sem registros',
  'Lead → Análise de crédito': 'sem registros',
  'Análise de crédito → Venda': 'sem registros',
  'Lead → Venda': 'sem registros',
};

export function TempoMedioAvancoChart({
  items,
  hasDateData,
}: {
  items: TempoMedioItem[];
  hasDateData: boolean;
}) {
  const hasValues = items.some((i) => i.dias !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tempo médio de avanço</CardTitle>
        <CardDescription>Tempo médio entre a entrada do lead e cada etapa do funil</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasDateData && !hasValues ? (
          <MaturacaoEmptyState message="Não há histórico suficiente de mudança de etapa para calcular dias sem avanço." />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {item.dias !== null
                      ? `${item.dias} dias`
                      : TEMPO_EMPTY_MESSAGES[item.label] ?? '—'}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{
                      width: item.dias !== null ? `${Math.min(100, (item.dias / 90) * 100)}%` : '0%',
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function IdadeLeadsAbertoCard({ faixas }: { faixas: IdadeFaixaItem[] }) {
  const total = faixas.reduce((a, b) => a + b.count, 0);
  const faixa61 = faixas.find((f) => f.faixa === '61+ dias')?.count ?? 0;
  const pct61 = total > 0 ? (faixa61 / total) * 100 : 0;
  const showAlert = total > 0 && pct61 >= 30;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Idade da base em aberto</CardTitle>
        <CardDescription>Há quanto tempo os leads ainda não concluíram o funil</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <MaturacaoEmptyState message="Nenhum lead em aberto no período filtrado." />
        ) : (
          <>
            {showAlert ? (
              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                Risco alto: muitos leads com 61+ dias em aberto.{' '}
                {faixa61.toLocaleString('pt-BR')} de {total.toLocaleString('pt-BR')} leads em aberto
                estão com 61+ dias ({pct61.toFixed(1).replace('.', ',')}%).
              </div>
            ) : null}
            <ul className="space-y-2">
              {faixas.map((faixa) => (
                <li key={faixa.faixa} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{faixa.faixa}</span>
                  <span className="font-medium tabular-nums">
                    {faixa.count.toLocaleString('pt-BR')} leads
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function CreditoSituacaoCard({ situacao }: { situacao: CreditoSituacao }) {
  const empty = situacao.emAnalise === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Análise de crédito</CardTitle>
        <CardDescription>Acompanhamento dos leads em etapa de crédito</CardDescription>
      </CardHeader>
      <CardContent>
        {empty ? (
          <MaturacaoEmptyState message="Nenhum lead em análise de crédito no período selecionado." />
        ) : (
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Em análise</dt>
              <dd className="text-lg font-semibold tabular-nums">{situacao.emAnalise}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tempo médio</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {situacao.tempoMedioDias !== null ? `${situacao.tempoMedioDias} dias` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dentro do prazo</dt>
              <dd className="text-lg font-semibold tabular-nums">{situacao.dentroDoPrazo}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Em acompanhamento</dt>
              <dd className="text-lg font-semibold tabular-nums">{situacao.emAcompanhamento}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Acima do prazo</dt>
              <dd className="text-lg font-semibold tabular-nums">{situacao.acimaDoPrazo}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Maior tempo</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {situacao.maiorTempoDias !== null ? `${situacao.maiorTempoDias} dias` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Aprovados</dt>
              <dd className="text-lg font-semibold tabular-nums">{situacao.aprovados}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Reprovados</dt>
              <dd className="text-lg font-semibold tabular-nums">{situacao.reprovados}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Vendas após crédito</dt>
              <dd className="text-lg font-semibold tabular-nums">{situacao.vendasAposCredito}</dd>
            </div>
          </dl>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Prazo ideal: até 5 dias. Atenção: 6 a 44 dias. Crítico: 45+ dias.
        </p>
      </CardContent>
    </Card>
  );
}
