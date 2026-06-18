/**
 * Rótulos canônicos de canal/fonte no painel Leads (espelha backend/leadsCanalMap.mjs).
 */

export const CANAL_BUCKETS = [
  'Meta Forms',
  'Site forms',
  'Painel CV',
  'WhatsApp',
  'Outros',
] as const;

const CANAL_BUCKET_ALIASES: Record<string, (typeof CANAL_BUCKETS)[number]> = {
  'formulário do site': 'Site forms',
  'formulario do site': 'Site forms',
  'meta forms': 'Meta Forms',
  'site forms': 'Site forms',
  'painel cv': 'Painel CV',
  whatsapp: 'WhatsApp',
  outros: 'Outros',
};

function normalizeCanalRaw(canal: string): string {
  return canal.trim().toLowerCase();
}

function resolveCanalBucket(canal: string): (typeof CANAL_BUCKETS)[number] {
  const norm = normalizeCanalRaw(canal);
  if (!norm) return 'Outros';
  if (norm === 'meta' || norm === 'facebook') return 'Meta Forms';
  if (norm === 'site' || norm === 'black site') return 'Site forms';
  if (norm === 'painel gestor' || norm === 'painel corretor' || norm === 'painel imobiliária') {
    return 'Painel CV';
  }
  if (norm === 'whatsapp' || norm === 'wa' || norm.includes('whatsapp')) return 'WhatsApp';
  return 'Outros';
}

/** Normaliza rótulo de bucket para exibição (case + aliases legados). */
export function normalizeCanalBucketLabel(canal: string | null | undefined): string {
  const trimmed = String(canal ?? '').trim();
  if (!trimmed) return 'Outros';

  const lower = trimmed.toLowerCase();
  if (CANAL_BUCKET_ALIASES[lower]) return CANAL_BUCKET_ALIASES[lower];

  for (const bucket of CANAL_BUCKETS) {
    if (bucket.toLowerCase() === lower) return bucket;
  }

  return resolveCanalBucket(trimmed);
}

export type LeadsFonteLabel = 'Marketing' | 'Externo';

/** Fonte de aquisição com capitalização consistente. */
export function normalizeFonteLabel(fonte: string | null | undefined): LeadsFonteLabel {
  const lower = String(fonte ?? '').trim().toLowerCase();
  if (lower === 'marketing') return 'Marketing';
  return 'Externo';
}

/** Title case de empreendimento na timeline (espelha backend). */
export function normalizeTimelineEmpreendimento(raw: string | null | undefined): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return 'Não informado';

  const lower = trimmed.toLowerCase().replace(/_/g, ' ');
  if (['outros', 'outro'].includes(lower)) return 'Outros';
  if (['nao sei', 'não sei', 'n a', 'na', 'nao informado', 'não informado'].includes(lower)) {
    return 'Não informado';
  }

  return trimmed
    .split(/\s+/)
    .map((word, index) => {
      const wl = word.toLowerCase();
      if (index > 0 && ['de', 'do', 'da', 'dos', 'das', 'e'].includes(wl)) return wl;
      return wl.charAt(0).toUpperCase() + wl.slice(1);
    })
    .join(' ');
}
