import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { LayoutGrid, Settings } from 'lucide-react';
import { BRAND_LOGO_SRC } from '@/lib/brandAssets';
import { vitrinePath } from '@/lib/panels';

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const items = Array.from({ length: 6 }, (_, i) => ({
    label: `Item ${i + 1}`,
    path: vitrinePath(`/item-${i + 1}`),
  }));

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-3 pr-14 min-h-[52px]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <img src={BRAND_LOGO_SRC} alt="" className="h-4 w-4 object-contain" />
        </div>
        <span className="font-semibold text-foreground text-sm">GêChat</span>
      </div>
      <CommandInput placeholder="Buscar páginas..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Navegação">
          {items.map((item) => (
            <CommandItem key={item.path} onSelect={() => runCommand(() => navigate(item.path))}>
              <LayoutGrid className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
          <CommandItem onSelect={() => runCommand(() => navigate(vitrinePath('/settings')))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Configurações</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
