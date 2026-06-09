import type { HTMLMotionProps, Variants } from 'framer-motion';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useAppMotion } from '@/hooks/useAppMotion';
import {
  motionFadeUp,
  motionStaggerContainer,
  motionStaggerItem,
  modalScaleFromFillRatio,
} from '@/lib/motionPresets';
import { cn } from '@/lib/utils';

type MotionRevealProps = HTMLMotionProps<'div'> & {
  index?: number;
  children: ReactNode;
};

/** Entrada suave (fade + subida) para cards, seções e blocos. */
export function MotionReveal({ index = 0, children, className, ...props }: MotionRevealProps) {
  const motionCfg = useAppMotion();

  if (!motionCfg.enabled) {
    return (
      <div className={className} {...(props as object)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...motionCfg.springSoft, delay: motionCfg.revealDelay(index) }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type MotionPageProps = {
  children: ReactNode;
  className?: string;
  pageKey?: string;
};

/** Transição de página/rota (fade + leve deslocamento). */
export function MotionPage({ children, className, pageKey }: MotionPageProps) {
  const motionCfg = useAppMotion();

  if (!motionCfg.enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={motionCfg.pageTransition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

type MotionStaggerProps = {
  children: ReactNode;
  className?: string;
  variants?: Variants;
};

export function MotionStagger({
  children,
  className,
  variants = motionStaggerContainer,
}: MotionStaggerProps) {
  const motionCfg = useAppMotion();

  if (!motionCfg.enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

type MotionStaggerItemProps = HTMLMotionProps<'div'> & {
  children: ReactNode;
  variants?: Variants;
};

export function MotionStaggerItem({
  children,
  className,
  variants = motionStaggerItem,
  ...props
}: MotionStaggerItemProps) {
  const motionCfg = useAppMotion();

  if (!motionCfg.enabled) {
    return (
      <div className={className} {...(props as object)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div variants={variants} className={className} {...props}>
      {children}
    </motion.div>
  );
}

type MotionPanelProps = {
  children: ReactNode;
  className?: string;
  /** 0–1: quanto o painel “cresce” na entrada (ex.: preenchimento do perfil). */
  fillRatio?: number;
};

/** Painel/modal com escala proporcional aos dados. */
export function MotionPanel({ children, className, fillRatio = 0.5 }: MotionPanelProps) {
  const motionCfg = useAppMotion();
  const initialScale = modalScaleFromFillRatio(fillRatio);

  if (!motionCfg.enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: initialScale, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: initialScale, y: 12 }}
      transition={motionCfg.spring}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type MotionFadeHeaderProps = {
  children: ReactNode;
  className?: string;
};

export function MotionFadeHeader({ children, className }: MotionFadeHeaderProps) {
  const motionCfg = useAppMotion();

  if (!motionCfg.enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div variants={motionFadeUp} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

type MotionNumberProps = {
  value: number | string;
  className?: string;
};

/** Número com leve “pop” na entrada ou ao mudar. */
export function MotionNumber({ value, className }: MotionNumberProps) {
  const motionCfg = useAppMotion();

  if (!motionCfg.enabled) {
    return <span className={className}>{value}</span>;
  }

  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={String(value)}
        initial={{ opacity: 0, scale: 0.82, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -4 }}
        transition={motionCfg.springSoft}
        className={cn('inline-block', className)}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}
