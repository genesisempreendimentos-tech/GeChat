import type { HTMLMotionProps, Variants } from 'framer-motion';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
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

const ODOMETER_DIGIT_HEIGHT = '1em';

type DisplayToken = {
  key: string;
  char: string;
  isDigit: boolean;
  digit: number | null;
};

function tokenizeDisplayValue(value: number | string): DisplayToken[] {
  return String(value).split('').map((char, index) => ({
    key: `pos-${index}`,
    char,
    isDigit: /\d/.test(char),
    digit: /\d/.test(char) ? Number(char) : null,
  }));
}

function OdometerDigit({ digit }: { digit: number }) {
  const motionCfg = useAppMotion();

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden leading-none"
      style={{ height: ODOMETER_DIGIT_HEIGHT, width: '1ch' }}
      aria-hidden
    >
      <motion.span
        className="absolute left-0 top-0 flex w-[1ch] flex-col tabular-nums leading-none"
        initial={false}
        animate={{ y: `calc(-${digit} * ${ODOMETER_DIGIT_HEIGHT})` }}
        transition={motionCfg.odometerSpring}
      >
        {Array.from({ length: 10 }, (_, d) => (
          <span
            key={d}
            className="flex w-[1ch] items-center justify-center leading-none"
            style={{ height: ODOMETER_DIGIT_HEIGHT }}
          >
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/** Número com odômetro: cada dígito anima individualmente até o próximo valor. */
export function MotionFlipNumber({ value, className }: MotionNumberProps) {
  const motionCfg = useAppMotion();
  const text = String(value);
  const tokens = tokenizeDisplayValue(text);
  const hasDigits = tokens.some((token) => token.isDigit);

  if (!motionCfg.enabled || !hasDigits) {
    return <span className={cn('tabular-nums', className)}>{text}</span>;
  }

  return (
    <span
      className={cn(
        'inline-flex h-[1em] items-center leading-none tabular-nums',
        className,
      )}
      aria-label={text}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {tokens.map((token) =>
          token.isDigit && token.digit != null ? (
            <motion.span
              key={token.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={motionCfg.odometerSlotTransition}
              className="inline-flex h-[1em] items-center"
            >
              <OdometerDigit digit={token.digit} />
            </motion.span>
          ) : (
            <motion.span
              key={token.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={motionCfg.odometerSlotTransition}
              className="inline-flex h-[1em] items-center leading-none"
            >
              {token.char}
            </motion.span>
          ),
        )}
      </AnimatePresence>
    </span>
  );
}

/** Alias legado — usa FLIP vertical. */
export function MotionNumber({ value, className }: MotionNumberProps) {
  return <MotionFlipNumber value={value} className={className} />;
}

type MotionFlipListItemProps = Pick<
  ComponentPropsWithoutRef<'tr'>,
  'children' | 'className' | 'role' | 'tabIndex' | 'aria-label' | 'onClick' | 'onKeyDown'
>;

/** Linha de lista/tabela com FLIP de posição ao reordenar ou filtrar. */
export function MotionFlipListItem({
  children,
  className,
  role,
  tabIndex,
  'aria-label': ariaLabel,
  onClick,
  onKeyDown,
}: MotionFlipListItemProps) {
  const motionCfg = useAppMotion();

  if (!motionCfg.enabled) {
    return (
      <tr
        className={className}
        role={role}
        tabIndex={tabIndex}
        aria-label={ariaLabel}
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        {children}
      </tr>
    );
  }

  return (
    <motion.tr
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        layout: motionCfg.springSoft,
        opacity: motionCfg.pageTransition,
        y: motionCfg.springSoft,
      }}
      className={className}
      role={role}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {children}
    </motion.tr>
  );
}

export { LayoutGroup };
