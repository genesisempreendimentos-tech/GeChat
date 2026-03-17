import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  date: Date;
  read?: boolean;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'Bem-vindo ao GêApps',
    description: 'Seu acesso foi ativado. Explore os sistemas disponíveis.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
  },
  {
    id: '2',
    title: 'Novo sistema disponível',
    description: 'GêForms está disponível na sua conta.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24),
    read: true,
  },
];

interface NotificationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsPanel({ open, onOpenChange }: NotificationsPanelProps) {
  const items = MOCK_NOTIFICATIONS;
  const unreadCount = items.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    // Placeholder: integração futura com backend
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border/70 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <DialogTitle className="text-lg">Notificações</DialogTitle>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
          <DialogDescription className="sr-only">
            Lista de notificações do GêApps
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0 px-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="rounded-full bg-muted p-4 mb-3">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">Nenhuma notificação</p>
              <p className="text-sm text-muted-foreground mt-1">
                Quando houver novidades, elas aparecerão aqui.
              </p>
            </div>
          ) : (
            <ul className="py-2 space-y-0">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={`rounded-lg px-3 py-3 transition-colors hover:bg-accent/50 ${
                    !item.read ? 'bg-primary/5' : ''
                  }`}
                >
                  <p className="font-medium text-sm text-foreground">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(item.date, { addSuffix: true, locale: ptBR })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
