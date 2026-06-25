import { LayoutGrid, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { vitrinePath } from '@/lib/panels';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const navItems: NavItem[] = [
    { icon: LayoutGrid, label: 'Item 1', path: vitrinePath('/item-1') },
    { icon: LayoutGrid, label: 'Item 2', path: vitrinePath('/item-2') },
    { icon: LayoutGrid, label: 'Item 3', path: vitrinePath('/item-3') },
    { icon: LayoutGrid, label: 'Item 4', path: vitrinePath('/item-4') },
    { icon: Settings, label: 'Config', path: vitrinePath('/settings') },
  ];

  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
