import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { databaseService } from '@/services/supabase';

/** Presets de posição/tamanho para ícones flutuantes. */
const FLOAT_PRESETS = [
  { top: '8%', left: '5%', size: 'w-12 h-12', delay: '0s' },
  { top: '25%', right: '12%', left: 'auto', size: 'w-12 h-12', delay: '2s' },
  { bottom: '30%', left: '8%', size: 'w-12 h-12', delay: '4s' },
  { top: '15%', right: '25%', left: 'auto', size: 'w-12 h-12', delay: '1s' },
  { bottom: '20%', right: '8%', left: 'auto', size: 'w-12 h-12', delay: '3s' },
  { top: '45%', left: '15%', size: 'w-12 h-12', delay: '5s' },
  { top: '60%', right: '18%', left: 'auto', size: 'w-12 h-12', delay: '0.5s' },
  { bottom: '15%', left: '22%', size: 'w-12 h-12', delay: '2.5s' },
  { top: '35%', right: '5%', left: 'auto', size: 'w-12 h-12', delay: '3.5s' },
  { bottom: '40%', right: '28%', left: 'auto', size: 'w-12 h-12', delay: '1.5s' },
  { top: '70%', left: '10%', size: 'w-12 h-12', delay: '4.5s' },
  { top: '5%', left: '35%', size: 'w-12 h-12', delay: '1s' },
  { top: '50%', left: '6%', size: 'w-12 h-12', delay: '6s' },
  { bottom: '8%', right: '20%', left: 'auto', size: 'w-12 h-12', delay: '2s' },
  { top: '40%', left: '45%', size: 'w-12 h-12', delay: '0s' },
];

const FALLBACK_LOGOS = [
  '/assets/systems/GeForms.png',
  '/assets/systems/GeTeam.png',
  '/assets/systems/GêApps.png',
];

type FloatPreset = (typeof FLOAT_PRESETS)[number];
type LogoItem = FloatPreset & { src: string };

function BackgroundLogo({ logo, index }: { logo: LogoItem; index: number }) {
  const [failed, setFailed] = useState(false);
  const src = encodeURI(logo.src);
  if (failed) return null;
  return (
    <div
      className={cn(
        'absolute opacity-[0.06] dark:opacity-[0.08] animate-float select-none',
        logo.size
      )}
      style={{
        ...(logo.top && { top: logo.top }),
        ...(logo.bottom && { bottom: logo.bottom }),
        left: logo.left ?? (logo.right ? 'auto' : undefined),
        ...(logo.right && { right: logo.right }),
        animationDelay: logo.delay,
        animationDuration: `${18 + (index % 5) * 2}s`,
      }}
    >
      <img
        src={src}
        alt=""
        className="w-full h-full object-contain drop-shadow-sm"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

/**
 * Fundo animado em tons da logo (teal/primary), com logos dos sistemas bem escondidas e animadas.
 * Respeita prefers-reduced-motion.
 */
export function AnimatedBackground({ className }: { className?: string }) {
  const [backgroundLogos, setBackgroundLogos] = useState<LogoItem[]>(
    FALLBACK_LOGOS.map((src, i) => ({ src, ...FLOAT_PRESETS[i % FLOAT_PRESETS.length] })),
  );

  useEffect(() => {
    let cancelled = false;
    const loadSystems = async () => {
      const { data } = await databaseService.getSystems();
      if (cancelled) return;
      const rows = Array.isArray(data) ? data : [];
      const icons = [...new Set(rows.map((s: any) => String(s?.icon ?? '').trim()).filter(Boolean))];
      if (!icons.length) return;
      const items: LogoItem[] = icons.slice(0, FLOAT_PRESETS.length).map((src, i) => ({
        src,
        ...FLOAT_PRESETS[i % FLOAT_PRESETS.length],
      }));
      setBackgroundLogos(items);
    };
    void loadSystems();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      aria-hidden
      className={cn(
        'fixed inset-0 z-0 overflow-hidden pointer-events-none',
        'bg-background',
        className
      )}
    >
      {/* Gradiente base suave */}
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.25]"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, hsl(var(--primary) / 0.35), transparent), radial-gradient(ellipse 60% 80% at 100% 50%, hsl(var(--primary) / 0.2), transparent), radial-gradient(ellipse 60% 80% at 0% 80%, hsl(var(--primary) / 0.2), transparent)',
        }}
      />

      {/* Blobs suaves em movimento (teal/primary) */}
      <div className="absolute inset-0">
        <div
          className="absolute w-[min(80vw,600px)] h-[min(80vw,600px)] rounded-full blur-[100px] opacity-20 dark:opacity-15 animate-blob-1"
          style={{ background: 'hsl(var(--primary))', top: '-20%', left: '-10%' }}
        />
        <div
          className="absolute w-[min(70vw,500px)] h-[min(70vw,500px)] rounded-full blur-[90px] opacity-15 dark:opacity-10 animate-blob-2"
          style={{ background: 'hsl(var(--primary))', top: '40%', right: '-15%' }}
        />
        <div
          className="absolute w-[min(60vw,400px)] h-[min(60vw,400px)] rounded-full blur-[80px] opacity-15 dark:opacity-10 animate-blob-3"
          style={{ background: 'hsl(var(--primary))', bottom: '-10%', left: '20%' }}
        />
      </div>

      {/* Logos dos sistemas: bem escondidas, animação suave. Se falhar o carregamento, não exibe ícone quebrado. */}
      <div className="absolute inset-0">
        {backgroundLogos.map((logo, i) => (
          <BackgroundLogo
            key={`${logo.src}-${i}`}
            logo={logo}
            index={i}
          />
        ))}
      </div>

      {/* Grid sutil */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  );
}
