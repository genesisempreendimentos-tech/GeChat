import { useMemo } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import type { Transition } from 'framer-motion';
import {
  motionModalSpring,
  motionModalTransition,
  motionPageTransition,
  motionSpring,
  motionSpringSoft,
  motionOdometerSpring,
  motionOdometerSlotTransition,
} from '@/lib/motionPresets';

const INSTANT: Transition = { duration: 0 };

export function useAppMotion() {
  const animations = useSettingsStore((s) => s.animations);

  return useMemo(
    () => ({
      enabled: animations,
      pageTransition: animations ? motionPageTransition : INSTANT,
      spring: animations ? motionSpring : INSTANT,
      springSoft: animations ? motionSpringSoft : INSTANT,
      odometerSpring: animations ? motionOdometerSpring : INSTANT,
      odometerSlotTransition: animations ? motionOdometerSlotTransition : INSTANT,
      modalSpring: animations ? motionModalSpring : INSTANT,
      modalTransition: animations ? motionModalTransition : INSTANT,
      staggerStep: animations ? 0.06 : 0,
      revealDelay: (index: number) => (animations ? index * 0.06 : 0),
    }),
    [animations],
  );
}
