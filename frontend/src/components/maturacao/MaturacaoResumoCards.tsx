import {
  AlertTriangle,
  Clock,
  Hourglass,
  PauseCircle,
  TrendingUp,
  Users,
} from 'lucide-react';
import { InfoBox } from '@/components/ui/infoboxes';
import type { MaturacaoResumoCards } from '@/lib/dadosMaturacao';

type MaturacaoResumoCardsProps = {
  cards: MaturacaoResumoCards;
};

function formatDias(value: number | null): string {
  if (value === null) return '—';
  return value === 1 ? '1 dia' : `${value} dias`;
}

export function MaturacaoResumoCards({ cards }: MaturacaoResumoCardsProps) {
  const highlight61 = cards.dias61Plus > 0 && cards.leadsEmAberto > 0
    && cards.dias61Plus / cards.leadsEmAberto >= 0.3;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <InfoBox
        title="Leads em aberto"
        value={cards.leadsEmAberto.toLocaleString('pt-BR')}
        icon={<Users className="h-4 w-4" />}
        cor="blue"
        infoTooltip="Leads que ainda não concluíram o funil (venda ou perda)."
        motionIndex={0}
      />
      <InfoBox
        title="31+ dias"
        value={cards.dias31Plus.toLocaleString('pt-BR')}
        icon={<Hourglass className="h-4 w-4" />}
        cor="amber"
        infoTooltip="Leads em aberto com idade igual ou maior que 31 dias."
        motionIndex={1}
      />
      <InfoBox
        title="61+ dias"
        value={cards.dias61Plus.toLocaleString('pt-BR')}
        icon={<AlertTriangle className="h-4 w-4" />}
        cor="amber"
        infoTooltip="Leads críticos ou muito antigos ainda em acompanhamento."
        className={highlight61 ? 'ring-2 ring-amber-500/40' : undefined}
        motionIndex={2}
      />
      <InfoBox
        title="Tempo até visita"
        value={formatDias(cards.tempoMedioVisita)}
        icon={<TrendingUp className="h-4 w-4" />}
        cor="violet"
        infoTooltip={
          cards.tempoMedioVisita === null
            ? 'Sem registros suficientes de visitas para calcular a média.'
            : 'Média de dias entre captação e visita.'
        }
        motionIndex={3}
      />
      <InfoBox
        title="Tempo até crédito"
        value={formatDias(cards.tempoMedioCredito)}
        icon={<Clock className="h-4 w-4" />}
        cor="violet"
        infoTooltip={
          cards.tempoMedioCredito === null
            ? 'Sem registros suficientes de análise de crédito para calcular a média.'
            : 'Média de dias entre captação e entrada em análise de crédito.'
        }
        motionIndex={4}
      />
      <InfoBox
        title="Leads parados"
        value={cards.leadsParados.toLocaleString('pt-BR')}
        icon={<PauseCircle className="h-4 w-4" />}
        cor="muted"
        infoTooltip="Leads em aberto sem mudança de etapa há 30 dias ou mais."
        motionIndex={5}
      />
    </div>
  );
}
