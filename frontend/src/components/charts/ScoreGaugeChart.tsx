import { NotoEmoji } from '@/components/leads/NotoEmoji';
import { MotionFlipNumber } from '@/components/motion/AppMotion';
import { getScoreEmoji, clampScore } from '@/lib/scoreEmoji';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useAppMotion } from '@/hooks/useAppMotion';

type ScoreGaugeChartProps = {
  value?: number;
  className?: string;
  /** Animação do emoji e do número — desligar quando o valor muda com frequência. */
  animated?: boolean;
};

/** Semicírculo aberto para baixo (∪): esquerda → direita. */
function downwardSemiArcPath(cx: number, cy: number, r: number) {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
}

export function ScoreGaugeChart({ value = 0, className, animated = true }: ScoreGaugeChartProps) {
  const motionCfg = useAppMotion();
  const useMotion = animated && motionCfg.enabled;
  const clamped = clampScore(value);
  const scoreEmoji = getScoreEmoji(clamped);
  const cx = 60;
  const cy = 34;
  const r = 30;
  const arcPath = downwardSemiArcPath(cx, cy, r);
  const arcUnits = 100;

  return (
    <div
      className={cn('flex shrink-0 items-center justify-center', className)}
      role="img"
      aria-label={`Pontuação ${clamped} — ${scoreEmoji.label}`}
    >
      <div className="relative aspect-[5/4] w-full max-w-[11rem] lg:max-w-[12.5rem]">
        <svg
          viewBox="0 0 120 80"
          className="absolute inset-0 h-full w-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <path
            d={arcPath}
            pathLength={arcUnits}
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            className="text-gray-200 dark:text-muted/30"
          />
          {clamped > 0 ? (
            <path
              d={arcPath}
              pathLength={arcUnits}
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${clamped} ${arcUnits - clamped}`}
              className="text-primary"
            />
          ) : null}
        </svg>

        {useMotion ? (
          <motion.div
            key={scoreEmoji.notoCode}
            className="pointer-events-none absolute inset-x-0 top-[30%] flex -translate-y-1/2 justify-center"
            title={scoreEmoji.label}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={motionCfg.springSoft}
          >
            <NotoEmoji
              code={scoreEmoji.notoCode}
              alt={scoreEmoji.emoji}
              size={36}
              className="drop-shadow-sm"
            />
          </motion.div>
        ) : (
          <div
            className="pointer-events-none absolute inset-x-0 top-[30%] flex -translate-y-1/2 justify-center"
            title={scoreEmoji.label}
          >
            <NotoEmoji
              code={scoreEmoji.notoCode}
              alt={scoreEmoji.emoji}
              size={36}
              className="drop-shadow-sm"
            />
          </div>
        )}

        <p className="pointer-events-none absolute inset-x-0 top-[78%] -translate-y-1/2 text-center text-3xl font-bold tabular-nums leading-none text-foreground lg:text-[2.125rem]">
          {useMotion ? <MotionFlipNumber value={clamped} /> : clamped}
        </p>
      </div>
    </div>
  );
}
