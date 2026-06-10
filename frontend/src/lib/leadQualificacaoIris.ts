import type { IrisVariant } from '@/components/ui/Iris';
import type { LeadQualificacao } from '@/rules/qualifyLead';

export function leadIrisVariantQualificacao(q: LeadQualificacao): IrisVariant {
  switch (q) {
    case 'Alta':
      return 'iris6';
    case 'Média':
      return 'iris4';
    case 'Baixa':
      return 'iris1';
    case 'Indefinida':
      return 'iris11';
    case 'N/A':
      return 'iris19';
    default:
      return 'iris6';
  }
}
