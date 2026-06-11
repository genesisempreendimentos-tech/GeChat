import type { LeadsInfoboxStats, LeadMetricsRow } from '@/lib/leadsMetrics';
import { getOrigemDominante } from '@/lib/leadsMetrics';
import { subDays } from 'date-fns';

export function buildDiagnosticoRapido(
  rows: LeadMetricsRow[],
  stats: LeadsInfoboxStats,
): string[] {
  const messages: string[] = [];
  const { leads, visitasAgendadas, analiseCredito, vendas } = stats;

  if (leads === 0) {
    return ['Nenhum lead no período filtrado.'];
  }

  if (leads >= 50) {
    messages.push('O volume de leads está alto.');
  } else {
    messages.push('O volume de leads é moderado no período.');
  }

  if (stats.forms > stats.whatsapp) {
    messages.push('A maior parte dos leads veio por formulário.');
  } else if (stats.whatsapp > 0) {
    messages.push('Parte relevante dos leads veio pelo WhatsApp.');
  }

  const indefinidos = rows.filter((r) => r.qualificacao === 'Indefinida').length;
  if (indefinidos / leads > 0.5) {
    messages.push('Muitos leads ainda estão sem qualificação.');
  }

  if (visitasAgendadas > 0 && analiseCredito === 0) {
    messages.push(
      'O comercial avançou até visitas, mas não há registros posteriores de análise de crédito.',
    );
  } else if (visitasAgendadas > 0) {
    messages.push('O comercial avançou leads até a etapa de visitas.');
  }

  if (vendas === 0) {
    messages.push('Não há vendas registradas no período ou na safra selecionada.');
  }

  const diretoCount = rows.filter((r) => /direto/i.test(r.origem)).length;
  if (diretoCount / leads > 0.4) {
    messages.push(
      'A origem "Direto" concentra muitos leads — verifique UTMs e rastreamento.',
    );
  }

  const recentCutoff = subDays(new Date(), 30).getTime();
  const recentLeads = rows.filter((r) => new Date(r.dataHora).getTime() >= recentCutoff);
  const recentVendas = recentLeads.filter((r) => r.cvcrm_is_sold).length;
  if (recentLeads.length > 20 && recentVendas === 0) {
    messages.push('A safra mais recente ainda pode estar em maturação.');
  }

  const oldCutoff = subDays(new Date(), 60).getTime();
  const oldOpen = rows.filter(
    (r) =>
      new Date(r.dataHora).getTime() < oldCutoff &&
      !r.cvcrm_is_sold &&
      r.status !== 'perdido',
  );
  if (oldOpen.length > 10) {
    messages.push('Existem leads antigos sem avanço — avaliar reativação ou encerramento.');
  }

  if (messages.length < 2) {
    const origem = getOrigemDominante(rows);
    if (origem !== '—') {
      messages.push(`Principal origem no período: ${origem}.`);
    }
  }

  return messages.slice(0, 4);
}
