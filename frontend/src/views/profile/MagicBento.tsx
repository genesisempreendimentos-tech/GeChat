import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

const BRAND_GLOW = '26, 147, 134';

export interface MagicBentoCard {
  title: string;
  description: string;
  label?: string;
}

interface MagicBentoProps {
  cardData: MagicBentoCard[];
  className?: string;
  enableTilt?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  glowColor?: string;
  spotlightRadius?: number;
}

function BentoCard({
  card,
  index,
  enableTilt,
  enableSpotlight,
  enableBorderGlow,
  glowColor = BRAND_GLOW,
  spotlightRadius = 300,
}: {
  card: MagicBentoCard;
  index: number;
  enableTilt: boolean;
  enableSpotlight: boolean;
  enableBorderGlow: boolean;
  glowColor: string;
  spotlightRadius: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [4, -4]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-4, 4]);
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const relX = (e.clientX - rect.left) / width;
    const relY = (e.clientY - rect.top) / height;
    x.set(relX - 0.5);
    y.set(relY - 0.5);
    setMousePosition({ x: relX * 100, y: relY * 100 });
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setMousePosition({ x: 50, y: 50 });
  };

  return (
    <motion.div
      ref={ref}
      className={cn(
        'relative rounded-xl border bg-card overflow-hidden transition-shadow',
        enableBorderGlow && 'border-primary/30 shadow-lg'
      )}
      style={
        enableTilt
          ? {
              rotateX,
              rotateY,
              transformPerspective: 1000,
            }
          : undefined
      }
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {enableSpotlight && (
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background: `radial-gradient(circle ${spotlightRadius}px at ${mousePosition.x}% ${mousePosition.y}%, rgba(${glowColor}, 0.25), transparent)`,
          }}
        />
      )}
      {enableBorderGlow && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-60"
          style={{
            background: `radial-gradient(circle ${spotlightRadius * 0.8}px at ${mousePosition.x}% ${mousePosition.y}%, rgba(${glowColor}, 0.15), transparent)`,
          }}
        />
      )}
      <div className="relative z-10 p-6">
        {card.label && (
          <span className="text-xs font-medium text-primary uppercase tracking-wider">
            {card.label}
          </span>
        )}
        <h3 className="mt-1 text-lg font-semibold">{card.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
      </div>
    </motion.div>
  );
}

export function MagicBento({
  cardData,
  className,
  enableTilt = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  glowColor = BRAND_GLOW,
  spotlightRadius = 300,
}: MagicBentoProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-3 gap-4',
        className
      )}
    >
      {cardData.map((card, index) => (
        <BentoCard
          key={index}
          card={card}
          index={index}
          enableTilt={enableTilt}
          enableSpotlight={enableSpotlight}
          enableBorderGlow={enableBorderGlow}
          glowColor={glowColor}
          spotlightRadius={spotlightRadius}
        />
      ))}
    </div>
  );
}
