import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppMotion } from '@/hooks/useAppMotion';

const FILTROS_PANEL_GAP_PX = 32;

export function FiltrosPanelMotion({
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
          key="dados-filtros-panel"
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: FILTROS_PANEL_GAP_PX }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{
            opacity: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
            height: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
            marginBottom: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
          }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
