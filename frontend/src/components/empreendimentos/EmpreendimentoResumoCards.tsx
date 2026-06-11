import {
  Building2,
  CheckCircle2,
  ClipboardList,
  MapPin,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react';
import { InfoBox } from '@/components/ui/infoboxes';
import type { EmpreendimentoResumoCards } from '@/lib/empreendimentosMetrics';

export function EmpreendimentoResumoCards({ cards }: { cards: EmpreendimentoResumoCards }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      <InfoBox
        title="Empreendimentos ativos"
        value={cards.empreendimentosAtivos.toLocaleString('pt-BR')}
        icon={<Building2 className="h-4 w-4" />}
        cor="blue"
        infoTooltip="Quantidade de empreendimentos com leads no período."
        motionIndex={0}
      />
      <InfoBox
        title="Leads captados"
        value={cards.leadsCaptados.toLocaleString('pt-BR')}
        icon={<Users className="h-4 w-4" />}
        cor="emerald"
        infoTooltip="Total de leads somando todos os empreendimentos."
        motionIndex={1}
      />
      <InfoBox
        title="Qualificados"
        value={cards.leadsQualificados.toLocaleString('pt-BR')}
        icon={<CheckCircle2 className="h-4 w-4" />}
        cor="violet"
        infoTooltip="Leads com qualificação alta ou média."
        motionIndex={2}
      />
      <InfoBox
        title="Em atendimento"
        value={cards.emAtendimento.toLocaleString('pt-BR')}
        icon={<ClipboardList className="h-4 w-4" />}
        cor="blue"
        infoTooltip="Leads em etapa de atendimento comercial."
        motionIndex={3}
      />
      <InfoBox
        title="Visitas"
        value={cards.visitas.toLocaleString('pt-BR')}
        icon={<MapPin className="h-4 w-4" />}
        cor="amber"
        infoTooltip="Visitas agendadas ou registradas."
        motionIndex={4}
      />
      <InfoBox
        title="Vendas"
        value={cards.vendas.toLocaleString('pt-BR')}
        icon={<ShoppingBag className="h-4 w-4" />}
        cor="emerald"
        infoTooltip="Vendas registradas no período."
        motionIndex={5}
      />
      <InfoBox
        title="Em aberto"
        value={cards.leadsEmAberto.toLocaleString('pt-BR')}
        icon={<TrendingUp className="h-4 w-4" />}
        cor="muted"
        infoTooltip="Leads ainda não concluídos (venda ou perda)."
        motionIndex={6}
      />
    </div>
  );
}
