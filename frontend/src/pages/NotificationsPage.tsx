import { useMemo, useState, useCallback, createElement } from 'react';
import {
  Bell,
  CheckCheck,
  Info,
  Sparkles,
  AlertTriangle,
  CircleAlert,
  Search,
  Inbox,
  Archive,
  Trash2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ControlLine } from '@/components/layout/ControlLine';
import { TabButtons, type TabButtonItem } from '@/components/ui/tab-buttons';
import { cn } from '@/lib/utils';
import { TRANSLUCENT_BIG_BOX } from '@/lib/translucentBigBox';
import { MainViewHeader } from '@/components/layout/header';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import type { NotificationItem } from '@/components/notifications/NotificationsPanel';

type NotificationTab = 'inbox' | 'archived' | 'deleted';

const TAB_ITEMS: ReadonlyArray<TabButtonItem<NotificationTab>> = [
  { value: 'inbox', label: 'Entrada', Icon: Inbox },
  { value: 'archived', label: 'Arquivadas', Icon: Archive },
  { value: 'deleted', label: 'Excluídas', Icon: Trash2 },
];

function notificationIcon(type: NotificationItem['type']) {
  switch (type) {
    case 'success':
      return Sparkles;
    case 'warning':
      return AlertTriangle;
    case 'error':
      return CircleAlert;
    case 'info':
    default:
      return Info;
  }
}

function iconShellClass(type: NotificationItem['type']) {
  switch (type) {
    case 'success':
      return 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400';
    case 'warning':
      return 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400';
    case 'error':
      return 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400';
    case 'info':
    default:
      return 'bg-primary/10 border-primary/25 text-primary';
  }
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [tab, setTab] = useState<NotificationTab>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => (selectedId ? items.find((n) => n.id === selectedId) ?? null : null),
    [items, selectedId],
  );

  const unreadInboxCount = useMemo(
    () => items.filter((n) => !n.deleted && !n.read).length,
    [items],
  );

  const visibleForTab = useCallback(
    (n: NotificationItem, t: NotificationTab) => {
      if (n.deleted) return t === 'deleted';
      if (t === 'deleted') return false;
      if (t === 'inbox') return !n.read;
      return n.read;
    },
    [],
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items
      .filter((n) => visibleForTab(n, tab))
      .filter(
        (n) =>
          !q ||
          n.title.toLowerCase().includes(q) ||
          (n.description ?? '').toLowerCase().includes(q),
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [items, tab, searchQuery, visibleForTab]);

  const openNotification = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
    setItems((prev) =>
      prev.map((n) => (n.id === id && !n.deleted ? { ...n, read: true } : n)),
    );
  };

  const closeDetail = (open: boolean) => {
    setDetailOpen(open);
    if (!open) setSelectedId(null);
  };

  const markAllRead = () => {
    setItems((prev) =>
      prev.map((n) => (n.deleted ? n : { ...n, read: true })),
    );
  };

  const moveToDeleted = (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, deleted: true, read: true } : n)),
    );
    if (selectedId === id) closeDetail(false);
  };

  const emptyCopy =
    tab === 'inbox'
      ? {
          title: 'Nada na entrada',
          hint: 'Notificações não lidas aparecem aqui. Ao abrir uma notificação, ela vai para Arquivadas.',
        }
      : tab === 'archived'
        ? {
            title: 'Nenhuma arquivada',
            hint: 'Itens lidos ficam nesta aba.',
          }
        : {
            title: 'Nenhuma excluída',
            hint: 'Removidas da lista aparecem aqui até a limpeza no banco.',
          };

  return (
    <MainViewFluidShell>
      <div className="space-y-6">
        <MainViewHeader
          icon={<Bell className="h-6 w-6" />}
          title="Notificações"
          description="Acompanhe notificações do sistema"
        />

        <div className="space-y-4">
          <ControlLine
            showViewToggle={false}
            leftContent={
              <TabButtons<NotificationTab>
                value={tab}
                items={TAB_ITEMS}
                onChange={setTab}
              />
            }
            centerContent={
              <div className="relative group/search w-full max-w-xl mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors" />
                <Input
                  placeholder="Buscar por título ou descrição…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 rounded-xl border-border/60 bg-background/50 shadow-sm w-full"
                />
              </div>
            }
            rightContent={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-2 rounded-xl shrink-0"
                disabled={unreadInboxCount === 0}
                onClick={markAllRead}
              >
                <CheckCheck className="w-4 h-4" />
                Marcar todas como lidas
              </Button>
            }
          />

          <div className={cn(TRANSLUCENT_BIG_BOX, 'shadow-none p-4 md:p-6')}>
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed border-border/60 rounded-xl bg-muted/5">
              <div className="rounded-full bg-muted/50 p-5 mb-4 border border-border/50">
                <Bell className="w-9 h-9 text-muted-foreground/50" />
              </div>
              <p className="font-semibold text-foreground">
                {searchQuery.trim() ? 'Nenhum resultado' : emptyCopy.title}
              </p>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                {searchQuery.trim()
                  ? 'Tente outros termos ou limpe a busca.'
                  : emptyCopy.hint}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/30 rounded-xl border border-border/50 overflow-hidden bg-card/40 dark:bg-card/20">
              <AnimatePresence initial={false}>
                {filteredItems.map((item, index) => {
                  const Icon = notificationIcon(item.type);
                  const unreadHere = tab === 'inbox';
                  return (
                    <motion.li
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        'group relative flex gap-4 p-4 md:p-5 transition-colors cursor-pointer',
                        'hover:bg-muted/25',
                        unreadHere && 'bg-primary/[0.04]',
                      )}
                      onClick={() => openNotification(item.id)}
                    >
                      {unreadHere && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-primary rounded-r-full" />
                      )}
                      <div
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
                          iconShellClass(item.type),
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p
                            className={cn(
                              'font-semibold text-sm md:text-base leading-snug',
                              unreadHere ? 'text-foreground' : 'text-foreground/90',
                            )}
                          >
                            {item.title}
                          </p>
                          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(item.date, { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                        {item.description ? (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                      {tab !== 'deleted' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                          aria-label="Excluir notificação"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveToDeleted(item.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      ) : null}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
          </div>
        </div>
      </div>

      <Dialog open={detailOpen} onOpenChange={closeDetail}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl">
          {selected ? (
            <>
              <div className="relative px-6 pt-8 pb-6 bg-gradient-to-b from-muted/40 to-background border-b border-border/40">
                <div
                  className={cn(
                    'mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 shadow-sm',
                    iconShellClass(selected.type),
                  )}
                >
                  {createElement(notificationIcon(selected.type), { className: 'w-8 h-8' })}
                </div>
                <DialogHeader className="space-y-3 text-center mt-5 px-0">
                  <DialogTitle className="text-xl font-bold tracking-tight leading-tight text-balance">
                    {selected.title}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    {selected.description ?? selected.title}
                  </DialogDescription>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {format(selected.date, "d 'de' MMMM yyyy '·' HH:mm", { locale: ptBR })}
                    <span className="block normal-case font-normal text-muted-foreground/80 mt-1">
                      {formatDistanceToNow(selected.date, { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </DialogHeader>
              </div>
              <div className="px-6 py-6">
                <div className="rounded-xl border border-border/50 bg-card/50 p-4 text-sm leading-relaxed text-muted-foreground">
                  {selected.description?.trim() ? (
                    selected.description
                  ) : (
                    <span className="italic opacity-70">Sem descrição adicional.</span>
                  )}
                </div>
                {tab !== 'deleted' && !selected.deleted ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-4 rounded-xl gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => moveToDeleted(selected.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Mover para excluídas
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </MainViewFluidShell>
  );
}
