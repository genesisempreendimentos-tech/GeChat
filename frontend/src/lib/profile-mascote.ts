const MASCOTE_LOTTIE_BY_KEY: Record<string, string> = {
  gato: '/animals/cat.lottie',
  cat: '/animals/cat.lottie',
  cachorro: '/animals/dog.lottie',
  dog: '/animals/dog.lottie',
  passaro: '/animals/bird.lottie',
  bird: '/animals/bird.lottie',
  terra: '/animals/terra.lottie',
  tigre: '/animals/tigre.lottie',
  cavalo: '/animals/cavalo.lottie',
  peixe: '/animals/peixe.lottie',
  leao: '/animals/leao.lottie',
};

export function resolveProfileMascoteKey(profile?: {
  mascote?: string | null;
  icon?: string | null;
} | null): string {
  const raw = String(profile?.mascote ?? profile?.icon ?? '').trim().toLowerCase();
  if (!raw || raw.startsWith('http') || raw.startsWith('/')) return '';
  return raw.replace(/\.lottie$/i, '');
}

export function resolveProfileMascoteLottie(profile?: {
  mascote?: string | null;
  icon?: string | null;
} | null): string | null {
  const key = resolveProfileMascoteKey(profile);
  if (key && MASCOTE_LOTTIE_BY_KEY[key]) {
    return MASCOTE_LOTTIE_BY_KEY[key];
  }

  const raw = String(profile?.mascote ?? profile?.icon ?? '').trim();
  if (!raw) return null;
  if (raw.endsWith('.lottie')) {
    return raw.startsWith('/') ? raw : `/animals/${raw}`;
  }
  return null;
}
