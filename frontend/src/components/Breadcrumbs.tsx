import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { vitrinePath } from '@/lib/panels';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const routeNames: Record<string, string> = {
  vitrine: 'Vitrine',
  settings: 'Configurações',
  notifications: 'Notificações',
  admin: 'Admin',
  home: 'Item 1',
  members: 'Item 2',
  categories: 'Item 3',
};

function formatSegment(path: string): string {
  if (routeNames[path]) return routeNames[path];
  const itemMatch = path.match(/^item-(\d+)$/);
  if (itemMatch) return `Item ${itemMatch[1]}`;
  return path.charAt(0).toUpperCase() + path.slice(1);
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const location = useLocation();

  const breadcrumbItems = items || generateBreadcrumbsFromPath(location.pathname);

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1.5 text-sm text-muted-foreground', className)}
    >
      <Link
        to={vitrinePath('/item-1')}
        className="flex items-center p-1 -m-1 rounded-md hover:text-foreground hover:bg-accent/50 transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
          {item.href ? (
            <Link
              to={item.href}
              className="px-1.5 py-0.5 rounded-md hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium px-1.5 py-0.5">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const paths = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  paths.forEach((path, index) => {
    const isLast = index === paths.length - 1;
    breadcrumbs.push({
      label: formatSegment(path),
      href: isLast ? undefined : `/${paths.slice(0, index + 1).join('/')}`,
    });
  });

  return breadcrumbs;
}
