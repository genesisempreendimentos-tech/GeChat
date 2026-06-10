import { Iris } from '@/components/ui/Iris';
import { cn } from '@/lib/utils';
import { leadIrisVariantQualificacao } from '@/lib/leadQualificacaoIris';
import type { LeadQualificacao } from '@/rules/qualifyLead';

type Props = {
  qualificacao: LeadQualificacao;
  className?: string;
};

/** Badge de qualificação nos cards — mesma apresentação da coluna na tabela. */
export function LeadQualificacaoEmojiTooltip({ qualificacao, className }: Props) {
  return (
    <Iris
      text={qualificacao}
      variant={leadIrisVariantQualificacao(qualificacao)}
      className={cn('shrink-0', className)}
    />
  );
}
