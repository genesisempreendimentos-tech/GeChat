import type { Transition, Variants } from 'framer-motion';

export const MOTION_EASE = [0.22, 1, 0.36, 1] as const;

export const motionSpring: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 32,
  mass: 0.85,
};

export const motionSpringSoft: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 28,
  mass: 0.9,
};

/** Spring fluido para modais (crescimento/redução por dados). */
export const motionModalSpring: Transition = {
  type: 'spring',
  stiffness: 190,
  damping: 24,
  mass: 1.1,
};

export const motionModalTransition = {
  opacity: { duration: 0.28, ease: MOTION_EASE },
  scale: motionModalSpring,
  x: { type: 'spring', stiffness: 220, damping: 26, mass: 1 },
  y: { type: 'spring', stiffness: 220, damping: 26, mass: 1 },
} as const;

export const motionPageTransition: Transition = {
  duration: 0.32,
  ease: MOTION_EASE,
};

export const motionStaggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

export const motionStaggerItem: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: motionSpringSoft,
  },
};

export const motionFadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: motionPageTransition },
};

/** Escala inicial do modal conforme preenchimento (0 = vazio, 1 = completo). */
export function modalScaleFromFillRatio(ratio: number, min = 0.78, max = 0.96) {
  const clamped = Math.max(0, Math.min(1, ratio));
  return min + clamped * (max - min);
}

export function profileDataFillRatio(fields: Array<unknown>) {
  if (!fields.length) return 0;
  const filled = fields.filter((value) => {
    if (value == null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
  }).length;
  return filled / fields.length;
}
