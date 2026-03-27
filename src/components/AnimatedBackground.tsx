import { cn } from '@/lib/utils';

/**
 * Fundo animado em tons da marca (teal/primary): gradiente, blobs e grid.
 * Respeita prefers-reduced-motion via classes globais nos blobs.
 */
export function AnimatedBackground({ className }: { className?: string }) {
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
