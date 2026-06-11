import { AlertTriangle, CheckCircle2, HelpCircle, Users } from 'lucide-react';
import { InfoBox } from '@/components/ui/infoboxes';
import type { QualidadeResumo } from '@/lib/qualidadeMetrics';
import { cn } from '@/lib/utils';

function formatPct(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export function QualidadeResumoCards({ resumo }: { resumo: QualidadeResumo }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <InfoBox
        title="Total de leads"
        value={resumo.total.toLocaleString('pt-BR')}
        icon={<Users className="h-4 w-4" />}
        cor="blue"
        infoTooltip="Leads considerados no período e filtros aplicados."
        motionIndex={0}
      />
      <InfoBox
        title="Qualificados"
        value={`${resumo.qualificados.toLocaleString('pt-BR')} (${formatPct(resumo.taxaQualificacao)})`}
        icon={<CheckCircle2 className="h-4 w-4" />}
        cor="emerald"
        infoTooltip="Leads com qualificação alta ou média."
        motionIndex={1}
      />
      <InfoBox
        title="Alta qualificação"
        value={`${resumo.alta.toLocaleString('pt-BR')} (${formatPct((resumo.alta / Math.max(resumo.total, 1)) * 100)})`}
        icon={<CheckCircle2 className="h-4 w-4" />}
        cor="violet"
        infoTooltip="Leads classificados como alta qualificação."
        motionIndex={2}
      />
      <InfoBox
        title="Sem qualificação"
        value={`${resumo.indefinida.toLocaleString('pt-BR')} (${formatPct(resumo.taxaIndefinida)})`}
        icon={<AlertTriangle className="h-4 w-4" />}
        cor="amber"
        infoTooltip="Leads indefinidos ou sem classificação registrada."
        motionIndex={3}
      />
    </div>
  );
}

export function QualidadeExplainSection() {
  const niveis = [
    {
      titulo: 'Alta',
      descricao: 'Perfil alinhado ao produto. Priorize contato rápido e avanço comercial.',
      className: 'border-emerald-500/25 bg-emerald-500/5',
    },
    {
      titulo: 'Média',
      descricao: 'Potencial com ressalvas. Vale nutrir e validar fit antes de escalar esforço.',
      className: 'border-blue-500/25 bg-blue-500/5',
    },
    {
      titulo: 'Baixa',
      descricao: 'Baixa aderência ao perfil ideal. Avalie se compensa investir tempo comercial.',
      className: 'border-amber-500/25 bg-amber-500/5',
    },
    {
      titulo: 'Indefinida',
      descricao: 'Sem classificação. Corrija formulários, CRM ou regras de qualificação automática.',
      className: 'border-border/70 bg-muted/20',
    },
  ];

  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-5">
      <div className="mb-4 flex items-start gap-2">
        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold text-foreground">Como ler a qualificação</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada lead recebe um nível com base no perfil e nas respostas captadas. Use os blocos
            abaixo para interpretar os números com mais clareza.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {niveis.map((item) => (
          <div key={item.titulo} className={cn('rounded-xl border p-4', item.className)}>
            <p className="text-sm font-semibold text-foreground">{item.titulo}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.descricao}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
