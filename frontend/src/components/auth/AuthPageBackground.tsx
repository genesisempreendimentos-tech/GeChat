import { cn } from '@/lib/utils';

/**
 * Fundo das páginas de autenticação — usa tokens do tema (light / dark / full-dark).
 */
export function AuthPageBackground({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/70 to-primary/15 dark:via-muted/35 dark:to-primary/20" />

      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="absolute top-0 left-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl dark:bg-primary/15" />
      <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-primary/10 blur-3xl dark:bg-primary/20" />
    </div>
  );
}
