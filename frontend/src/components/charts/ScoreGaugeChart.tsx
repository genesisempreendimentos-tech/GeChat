import { NotoEmoji } from '@/components/leads/NotoEmoji';
import { MotionFlipNumber } from '@/components/motion/AppMotion';
import { getScoreEmoji, clampScore } from '@/lib/scoreEmoji';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useAppMotion } from '@/hooks/useAppMotion';

type ScoreGaugeChartProps = {
  value?: number;
  className?: string;
};

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const sweep = startDeg > endDeg ? 0 : 1;
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
}

export function ScoreGaugeChart({ value = 0, className }: ScoreGaugeChartProps) {
  const motionCfg = useAppMotion();
  const clamped = clampScore(value);
  const scoreEmoji = getScoreEmoji(clamped);
  const cx = 60;
  const cy = 54;
  const r = 36;
  const startDeg = 180;
  const endDeg = 0;
  const valueEndDeg = startDeg - (clamped / 100) * 180;

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
            d={arcPath(cx, cy, r, startDeg, endDeg)}
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            className="text-muted/30"
          />
          {clamped > 0 ? (
            <path
              d={arcPath(cx, cy, r, startDeg, valueEndDeg)}
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              className="text-primary"
            />
          ) : null}
        </svg>

        <motion.div
          key={scoreEmoji.notoCode}
          className="pointer-events-none absolute inset-x-0 top-[26%] flex -translate-y-1/2 justify-center"
          title={scoreEmoji.label}
          initial={motionCfg.enabled ? { opacity: 0, scale: 0.6 } : false}
          animate={motionCfg.enabled ? { opacity: 1, scale: 1 } : undefined}
          transition={motionCfg.springSoft}
        >
          <NotoEmoji
            code={scoreEmoji.notoCode}
            alt={scoreEmoji.emoji}
            size={40}
            className="drop-shadow-sm"
          />
        </motion.div>

        <p className="pointer-events-none absolute inset-x-0 top-[70%] -translate-y-1/2 text-center text-3xl font-bold tabular-nums leading-none text-foreground lg:text-[2.125rem]">
          <MotionFlipNumber value={clamped} />
        </p>
      </div>
    </div>
  );
}
