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
import { MessageSquare, Settings } from 'lucide-react';
import { BRAND_LOGO_SRC } from '@/lib/brandAssets';
import { useGeChatStore } from '@/store/gechatStore';

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const conversations = useGeChatStore((s) => s.conversations);

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

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-3 pr-14 min-h-[52px]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <img src={BRAND_LOGO_SRC} alt="" className="h-4 w-4 object-contain" />
        </div>
        <span className="font-semibold text-foreground text-sm">GêChat</span>
      </div>
      <CommandInput placeholder="Buscar conversas..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        {conversations.length > 0 && (
          <CommandGroup heading="Conversas">
            {conversations.slice(0, 8).map((conv) => (
              <CommandItem
                key={conv.id}
                onSelect={() => runCommand(() => navigate(`/c/${conv.id}`))}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                <span>{conv.displayName ?? conv.name ?? 'Conversa'}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Ações">
          <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Configurações</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
