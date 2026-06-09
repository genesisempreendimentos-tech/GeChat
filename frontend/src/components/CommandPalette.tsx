import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { LayoutDashboard, BarChart3, Users, UserCircle, Settings, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { BRAND_LOGO_SRC } from '@/lib/brandAssets';

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const isAdminPath = location.pathname.startsWith('/admin');

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
      <CommandInput placeholder="Buscar p�ginas..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Navega��o">
          <CommandItem onSelect={() => runCommand(() => navigate(isAdminPath ? '/admin/home' : '/dashboard'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          {!isAdminPath && (
            <>
              <CommandItem onSelect={() => runCommand(() => navigate('/dados'))}>
                <BarChart3 className="mr-2 h-4 w-4" />
                <span>Dados</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/leads'))}>
                <Users className="mr-2 h-4 w-4" />
                <span>Leads</span>
              </CommandItem>
            </>
          )}
          <CommandItem onSelect={() => runCommand(() => navigate('/profile'))}>
            <UserCircle className="mr-2 h-4 w-4" />
            <span>Perfil</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Configura��es</span>
          </CommandItem>
          {user?.accessType === 'admin' && (
            <CommandItem onSelect={() => runCommand(() => navigate('/admin/home'))}>
              <Shield className="mr-2 h-4 w-4" />
              <span>Painel Admin</span>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
