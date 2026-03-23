import { PanelLeft, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useSidebarLayoutStore } from '@/store/sidebarLayoutStore';
import type { SidebarMode } from '@/lib/sidebarMode';

const MODES: { value: SidebarMode; Icon: React.ElementType; label: string }[] = [
  { value: 'collapsed', Icon: PanelLeft,      label: 'Menu sempre recolhido' },
  { value: 'hover',     Icon: PanelLeftOpen,  label: 'Expandir ao passar o mouse' },
  { value: 'expanded',  Icon: PanelLeftClose, label: 'Menu sempre expandido' },
];

function modeIcon(mode: SidebarMode): React.ElementType {
  return MODES.find((m) => m.value === mode)?.Icon ?? PanelLeftOpen;
}

type Props = {
  /** true = sidebar está expandida (mostra segmented control). false = recolhida (mostra botão único). */
  isExpanded: boolean;
};

export function SidebarFooterControl({ isExpanded }: Props) {
  const mode = useSidebarLayoutStore((s) => s.mode);
  const setMode = useSidebarLayoutStore((s) => s.setMode);
  const user = useAuthStore((s) => s.user);

  async function handleSetMode(value: SidebarMode) {
    const res = await setMode(value, user?.id);
    if (user?.id && res && !res.error) {
      useAuthStore.getState().updateUser({ sidebar: value });
    }
  }

  const ActiveIcon = modeIcon(mode);

  return (
    <div className="relative flex h-[56px] items-center justify-center overflow-hidden">

      {/* ── Segmented control: visível quando expandido ── */}
      <div
        className={cn(
          'absolute flex items-stretch gap-1 p-1.5 rounded-2xl transition-all duration-300',
          'w-[calc(100%-16px)]',
          'bg-muted/60 dark:bg-muted/40',
          'border border-border/60',
          'shadow-inner',
          isExpanded
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-90 pointer-events-none',
        )}
      >
        {MODES.map(({ value, Icon, label }, idx) => {
          const isActive = mode === value;
          const isLast = idx === MODES.length - 1;
          return (
            <div key={value} className="contents">
              <button
                type="button"
                onClick={() => handleSetMode(value)}
                title={label}
                aria-label={label}
                aria-pressed={isActive}
                className={cn(
                  'relative flex flex-1 items-center justify-center py-1.5 rounded-xl',
                  'transition-all duration-200 ease-out select-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  isActive
                    ? 'bg-background dark:bg-muted shadow-sm ring-1 ring-border/60 scale-[1.02]'
                    : 'hover:bg-background/50 dark:hover:bg-muted/30 active:scale-95',
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 transition-colors duration-200',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground',
                  )}
                />
              </button>

              {/* Divisor entre botões (não após o último) */}
              {!isLast && (
                <div className="w-px self-stretch my-1 bg-border/60 rounded-full flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Botão único: visível quando recolhido ── */}
      <div
        className={cn(
          'absolute flex items-center justify-center transition-all duration-300',
          !isExpanded
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-90 pointer-events-none',
        )}
      >
        <button
          type="button"
          onClick={() => handleSetMode('expanded')}
          title="Expandir sidebar"
          aria-label="Expandir sidebar"
          className={cn(
            'group flex items-center justify-center w-10 h-10 rounded-xl',
            'transition-all duration-200 ease-out active:scale-95',
            'bg-muted/40 dark:bg-muted/20',
            'border border-border/40',
            'hover:bg-primary/10 dark:hover:bg-primary/10',
            'hover:border-primary/30',
            'hover:shadow-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <ActiveIcon
            className={cn(
              'w-4 h-4 transition-colors duration-200',
              'text-muted-foreground',
              'group-hover:text-primary',
            )}
          />
        </button>
      </div>

    </div>
  );
}
