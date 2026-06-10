export type ScoreEmojiBand = {
  min: number;
  max: number;
  emoji: string;
  notoCode: string;
  label: string;
};

/** Faixas de pontuação leads → emoji animado (Noto). */
export const SCORE_EMOJI_BANDS: ScoreEmojiBand[] = [
  { min: 0, max: 25, emoji: '😢', notoCode: '1f622', label: 'Crítico' },
  { min: 26, max: 50, emoji: '😮', notoCode: '1f62e', label: 'Atenção' },
  { min: 51, max: 70, emoji: '👍', notoCode: '1f44d', label: 'Regular' },
  { min: 71, max: 85, emoji: '🔥', notoCode: '1f525', label: 'Bom' },
  { min: 86, max: 100, emoji: '🚀', notoCode: '1f680', label: 'Excelente' },
];

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function getScoreEmoji(value: number): ScoreEmojiBand {
  const clamped = clampScore(value);
  return (
    SCORE_EMOJI_BANDS.find((band) => clamped >= band.min && clamped <= band.max) ??
    SCORE_EMOJI_BANDS[SCORE_EMOJI_BANDS.length - 1]
  );
}
