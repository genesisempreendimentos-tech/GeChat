import { useState } from 'react';
import { Bell, CheckCheck, Info, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NotificationItem } from '@/components/notifications/NotificationsPanel';

// Usando os mesmos mocks do painel para manter consistência por enquanto
const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'Bem-vindo ao GêApps',
    description: 'Seu acesso foi ativado. Explore os sistemas disponíveis.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
    type: 'success',
  },
  {
    id: '2',
    title: 'Novo sistema disponível',
    description: 'GêForms está disponível na sua conta.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24),
    read: true,
    type: 'info',
  },
];

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);

  const unreadCount = items.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setItems(items.map(item => ({ ...item, read: true })));
  };

  const handleMarkAsRead = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, read: true } : item));
  };

  return (
    <div className="flex-1 min-w-0 px-4 md:px-8 pt-6 md:pt-8 pb-20 md:pb-8 w-full max-w-[1200px] mx-auto">
      <div className="space-y-6">
        {/* Header da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Notificações</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Acompanhe as atualizações e alertas do seu sistema
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0 self-start sm:self-auto hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="w-4 h-4" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Lista de Notificações */}
        <div className="rounded-2xl border border-border/70 bg-card/30 dark:bg-card/20 shadow-sm overflow-hidden">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
              <div className="rounded-full bg-muted/50 p-6 mb-4 border border-border/50 shadow-inner">
                <Bell className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <p className="font-semibold text-foreground tracking-tight text-lg">Nenhuma notificação</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-[300px]">
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
                    onClick={() => !item.read && handleMarkAsRead(item.id)}
                    className={cn(
                      'group relative flex gap-5 p-6 md:p-8 transition-all duration-200 hover:bg-muted/30',
                      !item.read ? 'bg-primary/[0.03] hover:bg-primary/[0.06] cursor-pointer' : ''
                    )}
                  >
                    {!item.read && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-16 bg-primary rounded-r-full shadow-[0_0_12px_rgba(var(--primary),0.6)]" />
                    )}
                    <div className="shrink-0 mt-1 md:mt-0">
                      <div className={cn(
                        "flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl border shadow-sm",
                        item.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                        item.type === 'info' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                        item.type === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                        item.type === 'error' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                        "bg-primary/10 border-primary/20 text-primary"
                      )}>
                        {item.type === 'success' ? <Sparkles className="w-6 h-6 md:w-7 md:h-7" /> : <Info className="w-6 h-6 md:w-7 md:h-7" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 md:mb-3">
                        <p className={cn(
                          "font-semibold text-base md:text-lg leading-tight",
                          !item.read ? "text-foreground" : "text-foreground/80"
                        )}>
                          {item.title}
                        </p>
                        <span className="text-[13px] font-medium text-muted-foreground/80 whitespace-nowrap shrink-0">
                          {formatDistanceToNow(item.date, { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      {item.description && (
                        <p className={cn(
                          "text-[15px] md:text-base leading-relaxed",
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
      </div>
    </div>
  );
}
