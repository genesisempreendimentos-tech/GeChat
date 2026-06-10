import type { IrisVariant } from '@/components/ui/Iris';

/** Rótulos amigáveis de campanha/parâmetro de origem (exibidos na UI). */
export const LEAD_PARAMETRO_LABELS = [
  'Lançamento 2026',
  'Google Ads',
  'Instagram Stories',
  'Remarketing',
  'Banner Principal',
  'Facebook Ads',
  'LinkedIn Patrocinado',
] as const;

export type LeadParametroLabel = (typeof LEAD_PARAMETRO_LABELS)[number];

const PARAMETRO_IRIS: Record<LeadParametroLabel, IrisVariant> = {
  'Lançamento 2026': 'iris11',
  'Google Ads': 'iris6',
  'Instagram Stories': 'iris14',
  Remarketing: 'iris4',
  'Banner Principal': 'iris2',
  'Facebook Ads': 'iris11',
  'LinkedIn Patrocinado': 'iris21',
};

export function leadIrisVariantParametro(value: string): IrisVariant {
  const key = value.trim() as LeadParametroLabel;
  return PARAMETRO_IRIS[key] ?? 'iris23';
}

export function formatLeadParametroDisplay(value: string): string {
  const t = value.trim();
  return t.length > 0 ? t : '—';
}
