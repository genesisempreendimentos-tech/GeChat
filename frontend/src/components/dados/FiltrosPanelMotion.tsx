import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
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
  const innerRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);

  useLayoutEffect(() => {
    const node = innerRef.current;
    if (!node) return;

    const update = () => setMeasuredHeight(node.scrollHeight);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [children]);

  if (!motionCfg.enabled) {
    return open ? <div className="mb-8">{children}</div> : null;
  }

  return (
    <motion.div
      initial={false}
      animate={{
        height: open ? measuredHeight : 0,
        opacity: open ? 1 : 0,
        marginBottom: open ? FILTROS_PANEL_GAP_PX : 0,
      }}
      transition={{
        opacity: motionCfg.pageTransition,
        height: motionCfg.springSoft,
        marginBottom: motionCfg.springSoft,
      }}
      className="overflow-hidden"
    >
      <div ref={innerRef} aria-hidden={!open}>
        {children}
      </div>
    </motion.div>
  );
}
