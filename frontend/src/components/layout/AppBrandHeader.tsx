import { Check, UserKey, UserStar } from 'lucide-react';
import { MirrorRectangular } from '@/components/icons/MirrorRectangular';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useAuthStore } from '@/store/authStore';
import { usePanelStore } from '@/store/panelStore';
import type { AppPanel } from '@/lib/panels';
import { PANEL_HOME } from '@/lib/panels';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BRAND_LOGO_SRC } from '@/lib/brandAssets';

/** Mesmo visual do cluster de ações à direita no Topbar. */
export const topbarPillClassName =
  'flex shrink-0 items-center rounded-full border border-border/50 bg-muted/40 p-2 shadow-sm transition-colors hover:bg-muted/50';

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-primary/10 shadow-sm">
        <img src={BRAND_LOGO_SRC} alt="" className="h-full w-full object-contain p-0.5" />
      </div>
      <span className="whitespace-nowrap bg-gradient-to-r from-foreground to-primary bg-clip-text text-base font-bold text-transparent">
        GêChat
      </span>
    </div>
  );
}

function PanelMenuItem({
  panel,
  activePanel,
  icon: Icon,
  label,
  onSelect,
}: {
  panel: AppPanel;
  activePanel: AppPanel;
  icon: typeof UserKey;
  label: string;
  onSelect: (panel: AppPanel) => void;
}) {
  const isActive = activePanel === panel;
  return (
    <DropdownMenuItem onClick={() => onSelect(panel)} className="cursor-pointer gap-2">
      {isActive ? <Check className="h-4 w-4 shrink-0" /> : <span className="w-4 shrink-0" />}
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </DropdownMenuItem>
  );
}

export function AppBrandControl({ className }: { className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  const { isSoftadmin } = useAdminAccess();
  const activePanel = usePanelStore((s) => s.activePanel);
  const setActivePanel = usePanelStore((s) => s.setActivePanel);
  const syncFromPathname = usePanelStore((s) => s.syncFromPathname);

  useEffect(() => {
    syncFromPathname(location.pathname);
  }, [location.pathname, syncFromPathname]);

  const pillClassName = cn(
    topbarPillClassName,
    'gap-2.5 pl-2 pr-4',
    isAuthenticated &&
      'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    className,
  );

  const switchPanel = (panel: AppPanel) => {
    setActivePanel(panel);
    navigate(PANEL_HOME[panel]);
  };

  if (!isAuthenticated) {
    return (
      <div className={pillClassName} aria-label="GêChat">
        <BrandMark />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={pillClassName} aria-label="Trocar painel">
          <BrandMark />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start" className="min-w-[180px]" sideOffset={6}>
        <PanelMenuItem
          panel="user"
          activePanel={activePanel}
          icon={UserKey}
          label="User"
          onSelect={switchPanel}
        />
        <PanelMenuItem
          panel="vitrine"
          activePanel={activePanel}
          icon={MirrorRectangular}
          label="Vitrine"
          onSelect={switchPanel}
        />
        {isSoftadmin ? (
          <PanelMenuItem
            panel="admin"
            activePanel={activePanel}
            icon={UserStar}
            label="Admin"
            onSelect={switchPanel}
          />
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
