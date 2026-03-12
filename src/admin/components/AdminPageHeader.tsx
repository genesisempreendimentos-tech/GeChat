import { type LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface AdminPageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function AdminPageHeader({ icon: Icon, title, description, action }: AdminPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Icon className="w-8 h-8" />
          {title}
        </h1>
        <p className="text-muted-foreground mt-2">{description}</p>
      </div>
      {action != null && <div className="flex gap-2">{action}</div>}
    </div>
  );
}
