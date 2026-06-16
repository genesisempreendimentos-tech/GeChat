import { LayoutDashboard, BarChart3, FileBarChart, Users, Settings } from 'lucide-react';
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
    { icon: LayoutDashboard, label: 'Dashboard', path: vitrinePath('/dashboard') },
    { icon: BarChart3, label: 'Análise', path: vitrinePath('/dados') },
    { icon: Users, label: 'Leads', path: vitrinePath('/leads') },
    { icon: FileBarChart, label: 'Relatórios', path: vitrinePath('/relatorios') },
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
