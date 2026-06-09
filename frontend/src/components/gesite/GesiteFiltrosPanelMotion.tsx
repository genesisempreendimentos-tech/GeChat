import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppMotion } from '@/hooks/useAppMotion';

const GESITE_FILTROS_PANEL_GAP_PX = 32;

export function GesiteFiltrosPanelMotion({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  const motionCfg = useAppMotion();

  if (!motionCfg.enabled) {
    return open ? <div className="mb-8">{children}</div> : null;
  }

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="gesite-filtros-panel"
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: GESITE_FILTROS_PANEL_GAP_PX }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{
            opacity: motionCfg.pageTransition,
            height: motionCfg.springSoft,
            marginBottom: motionCfg.springSoft,
          }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
