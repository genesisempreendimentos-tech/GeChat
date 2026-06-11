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
import { LayoutDashboard, BarChart3, FileBarChart, Users, UserCircle, Settings, ExternalLink, Award } from 'lucide-react';
import { BRAND_LOGO_SRC, GEAPPS_PROFILE_URL } from '@/lib/brandAssets';

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

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-3 pr-14 min-h-[52px]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <img src={BRAND_LOGO_SRC} alt="" className="h-4 w-4 object-contain" />
        </div>
        <span className="font-semibold text-foreground text-sm">GêLeads</span>
      </div>
      <CommandInput placeholder="Buscar páginas..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Navegação">
          <CommandItem onSelect={() => runCommand(() => navigate('/dashboard'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/dados'))}>
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Análise</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/dados/qualidade'))}>
            <Award className="mr-2 h-4 w-4" />
            <span>Qualidade</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/leads'))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Leads</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/relatorios'))}>
            <FileBarChart className="mr-2 h-4 w-4" />
            <span>Relatórios</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => { window.location.href = GEAPPS_PROFILE_URL; })}
            className="justify-between gap-2"
          >
            <span className="flex items-center">
              <UserCircle className="mr-2 h-4 w-4 shrink-0" />
              Perfil
            </span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Configurações</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
