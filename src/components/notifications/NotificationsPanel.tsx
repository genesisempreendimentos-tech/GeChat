import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Info, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  date: Date;
  read?: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface NotificationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fonte única com o Topbar; vazio até integração com API */
  items?: NotificationItem[];
}

export function NotificationsPanel({ open, onOpenChange, items = [] }: NotificationsPanelProps) {
  const navigate = useNavigate();
  const unreadCount = items.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    // Placeholder: integração futura com backend
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh] border border-border/40 shadow-2xl rounded-2xl bg-background/95 backdrop-blur-xl">
        <DialogHeader className="pl-5 pr-12 py-5 border-b border-border/40 shrink-0 bg-muted/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <DialogTitle 
                className="text-xl font-semibold tracking-tight hover:text-primary cursor-pointer transition-colors"
                onClick={() => {
                  onOpenChange(false);
                  navigate('/notifications');
                }}
              >
                Notificações
              </DialogTitle>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 px-2.5 rounded-lg transition-colors self-start sm:self-auto"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="w-4 h-4 mr-1.5" />
                Marcar como lidas
              </Button>
            )}
          </div>
          <DialogDescription className="sr-only">
            Lista de notificações do GêApps
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0 bg-background/50">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="rounded-full bg-muted/50 p-5 mb-4 border border-border/50 shadow-inner">
                <Bell className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="font-semibold text-foreground tracking-tight">Nenhuma notificação</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-[250px]">
                Você está em dia! Quando houver novidades, elas aparecerão aqui.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/30">
              <AnimatePresence initial={false}>
                {items.map((item, index) => (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'group relative flex gap-5 p-6 transition-all duration-200 hover:bg-muted/30 cursor-default',
                      !item.read ? 'bg-primary/[0.03] hover:bg-primary/[0.06]' : ''
                    )}
                  >
                    {!item.read && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-primary rounded-r-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                    )}
                    <div className="shrink-0 mt-1">
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full border shadow-sm",
                        item.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                        item.type === 'info' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                        item.type === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                        item.type === 'error' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                        "bg-primary/10 border-primary/20 text-primary"
                      )}>
                        {item.type === 'success' ? <Sparkles className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 sm:gap-4 mb-2">
                        <p className={cn(
                          "font-semibold text-base leading-tight",
                          !item.read ? "text-foreground" : "text-foreground/80"
                        )}>
                          {item.title}
                        </p>
                        <span className="text-[12px] font-medium text-muted-foreground/80 whitespace-nowrap shrink-0">
                          {formatDistanceToNow(item.date, { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      {item.description && (
                        <p className={cn(
                          "text-[15px] leading-relaxed",
                          !item.read ? "text-muted-foreground" : "text-muted-foreground/70"
                        )}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
