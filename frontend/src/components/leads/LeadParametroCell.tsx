import { Iris } from '@/components/ui/Iris';
import { formatLeadParametroDisplay, leadIrisVariantParametro } from '@/lib/leadParametro';

type Props = {
  value: string;
};

export function LeadParametroCell({ value }: Props) {
  const label = formatLeadParametroDisplay(value);
  if (label === '—') {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return <Iris text={label} variant={leadIrisVariantParametro(value)} className="max-w-[12rem]" />;
}
