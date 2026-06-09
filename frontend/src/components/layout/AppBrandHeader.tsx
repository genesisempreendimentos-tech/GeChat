import { Check, UserKey, UserStar } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BRAND_LOGO_SRC } from '@/lib/brandAssets';

export function BrandMark() {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
        <img
          src={BRAND_LOGO_SRC}
          alt=""
          className="h-full w-full object-contain"
        />
      </div>
      <span className="whitespace-nowrap bg-gradient-to-r from-foreground to-primary bg-clip-text text-xl font-bold text-transparent">
        GêLeads
      </span>
    </div>
  );
}

export function AppBrandControl({ className }: { className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSoftadmin } = useAdminAccess();
  const isInAdmin = location.pathname.startsWith('/admin');

  const interactiveClass = cn(
    'flex min-w-0 items-center justify-center',
    isSoftadmin && 'cursor-pointer rounded-lg transition-colors outline-none hover:bg-accent/30',
    isSoftadmin &&
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    className,
  );

  if (isSoftadmin) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={interactiveClass} aria-label="Trocar painel">
            <BrandMark />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="center" className="min-w-[180px]" sideOffset={4}>
          <DropdownMenuItem onClick={() => navigate('/dashboard')} className="cursor-pointer gap-2">
            {!isInAdmin && <Check className="h-4 w-4 shrink-0" />}
            {isInAdmin && <span className="w-4 shrink-0" />}
            <UserKey className="h-4 w-4 shrink-0" />
            Painel User
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/admin/home')} className="cursor-pointer gap-2">
            {isInAdmin && <Check className="h-4 w-4 shrink-0" />}
            {!isInAdmin && <span className="w-4 shrink-0" />}
            <UserStar className="h-4 w-4 shrink-0" />
            Painel Admin
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className={interactiveClass} aria-label="GêLeads">
      <BrandMark />
    </div>
  );
}
