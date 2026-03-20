import { useState } from 'react';
import { PanelLeftDashed, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useSidebarLayoutStore } from '@/store/sidebarLayoutStore';
import type { SidebarMode } from '@/lib/sidebarMode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const OPTIONS: { value: SidebarMode; label: string }[] = [
  { value: 'hover', label: 'Hover' },
  { value: 'expanded', label: 'Expanded' },
  { value: 'collapsed', label: 'Collapsed' },
];

type Props = {
  /** Quando true, mostra rótulo ao lado do ícone (sidebar expandido). */
  showLabel: boolean;
};

export function SidebarFooterControl({ showLabel }: Props) {
  const [open, setOpen] = useState(false);
  const mode = useSidebarLayoutStore((s) => s.mode);
  const setMode = useSidebarLayoutStore((s) => s.setMode);
  const user = useAuthStore((s) => s.user);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Sidebar control"
        aria-label="Sidebar control"
        className={cn(
          'flex items-center gap-2 rounded-lg text-xs text-muted-foreground transition-colors',
          'hover:text-foreground hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          showLabel ? 'w-full justify-center px-3 py-2' : 'justify-center p-2 mx-auto'
        )}
      >
        <PanelLeftDashed className="h-4 w-4 shrink-0" aria-hidden />
        {showLabel ? <span className="font-medium">Sidebar control</span> : null}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[360px] gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-2 space-y-1">
            <DialogTitle>Sidebar Control</DialogTitle>
          </DialogHeader>
          <div className="px-3 pb-4 pt-1 flex flex-col gap-1">
            {OPTIONS.map(({ value, label }) => {
              const selected = mode === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={async () => {
                    const res = await setMode(value, user?.id);
                    if (user?.id && res && !res.error) {
                      useAuthStore.getState().updateUser({ sidebar: value });
                    }
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                    selected
                      ? 'bg-primary/10 text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
                  )}
                >
                  {label}
                  {selected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : <span className="w-4" />}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
