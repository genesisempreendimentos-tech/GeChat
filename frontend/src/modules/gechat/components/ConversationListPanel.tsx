import { useMemo, useState, type ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Archive,
  ArrowLeft,
  Eye,
  MoreVertical,
  Search,
  Settings,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { NewConversationDialog } from '@/modules/gechat/components/NewConversationDialog';
import { WhatsappConversationRow } from '@/modules/gechat/components/WhatsappConversationRow';
import {
  applyConversationListFilter,
  CONVERSATION_LIST_FILTERS,
  sortConversationsForList,
  type ConversationListFilter,
} from '@/modules/gechat/lib/conversation-list-filters';
import { useGeChat } from '@/modules/gechat/hooks/useGeChat';
import { useGeChatStore } from '@/store/gechatStore';
import { useConversationListStore } from '@/store/conversationListStore';
import { useAppMotion } from '@/hooks/useAppMotion';
import { MOTION_EASE } from '@/lib/motionPresets';

interface ConversationListPanelProps {
  isExpanded: boolean;
  onSidebarHoverLockChange?: (locked: boolean) => void;
}

function conversationInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatSidebarDate() {
  const formatted = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function ConversationFilterChip({
  label,
  icon: Icon,
  selected,
  onClick,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  selected: boolean;
  onClick: () => void;
}) {
  const motionCfg = useAppMotion();

  const chip = (
    <motion.button
      type="button"
      layout
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      transition={motionCfg.springSoft}
      className={cn(
        'relative inline-flex h-8 shrink-0 items-center justify-center overflow-hidden rounded-full font-medium',
        selected
          ? 'px-3 text-primary'
          : 'w-8 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {selected && (
        <motion.span
          layoutId="gechat-conversation-filter-pill"
          className="absolute inset-0 rounded-full bg-primary/15 shadow-sm ring-1 ring-primary/20"
          transition={motionCfg.springSoft}
        />
      )}
      <span className="relative z-[1] flex items-center gap-1.5">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <AnimatePresence initial={false} mode="popLayout">
          {selected && (
            <motion.span
              key={`${label}-label`}
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{
                opacity: { duration: 0.16, ease: MOTION_EASE },
                width: motionCfg.springSoft,
              }}
              className="overflow-hidden text-xs leading-none whitespace-nowrap"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  );

  if (selected) return chip;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={6}
        className="border-border/80 bg-popover/95 px-2.5 py-1 text-xs font-medium text-popover-foreground shadow-lg backdrop-blur-sm"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function ConversationListPanel({
  isExpanded,
  onSidebarHoverLockChange,
}: ConversationListPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { openConversation } = useGeChat();
  const conversations = useGeChatStore((s) => s.conversations);
  const unreadCounters = useGeChatStore((s) => s.unreadCounters);
  const typingUsersByConversation = useGeChatStore((s) => s.typingUsersByConversation);
  const favoriteIds = useConversationListStore((s) => s.favoriteIds);
  const pinnedIds = useConversationListStore((s) => s.pinnedIds);
  const archivedIds = useConversationListStore((s) => s.archivedIds);
  const readInBackground = useConversationListStore((s) => s.readInBackground);
  const setReadInBackground = useConversationListStore((s) => s.setReadInBackground);

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ConversationListFilter>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const motionCfg = useAppMotion();

  const handleMenuLockChange = (open: boolean) => {
    onSidebarHoverLockChange?.(open);
  };

  const activeConversationId = location.pathname.startsWith('/c/')
    ? location.pathname.split('/c/')[1]?.split('/')[0]
    : null;

  const todayLabel = useMemo(() => formatSidebarDate(), []);

  const archivedCount = useMemo(
    () => conversations.filter((c) => archivedIds.includes(c.id)).length,
    [conversations, archivedIds],
  );

  const filtered = useMemo(() => {
    const list = applyConversationListFilter(conversations, filter, {
      searchQuery,
      favoriteIds,
      archivedIds,
      unreadCounters,
      showArchived,
    });
    return sortConversationsForList(list, pinnedIds, unreadCounters, typingUsersByConversation);
  }, [
    conversations,
    filter,
    searchQuery,
    favoriteIds,
    archivedIds,
    unreadCounters,
    typingUsersByConversation,
    showArchived,
    pinnedIds,
  ]);

  const handleOpenConversation = (id: string) => {
    navigate(`/c/${id}`);
    void openConversation(id);
  };

  const handleCreated = (id: string) => {
    navigate(`/c/${id}`);
  };

  if (!isExpanded) {
    const collapsedConversations = sortConversationsForList(
      applyConversationListFilter(conversations, 'all', {
        searchQuery: '',
        favoriteIds,
        archivedIds,
        unreadCounters,
        showArchived: false,
      }),
      pinnedIds,
      unreadCounters,
      typingUsersByConversation,
    ).slice(0, 12);

    return (
      <TooltipProvider delayDuration={200}>
        <div className="flex flex-col items-center gap-1.5 py-2">
          <NewConversationDialog onCreated={handleCreated} prominent triggerIconOnly />
          {collapsedConversations.map((conv) => {
            const label = conv.displayName ?? conv.name ?? 'Conversa';
            const unread = unreadCounters[conv.id] ?? 0;
            const isActive = activeConversationId === conv.id;
            return (
              <Tooltip key={conv.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleOpenConversation(conv.id)}
                    aria-label={label}
                    className={cn(
                      'relative rounded-full transition-transform hover:scale-[1.03]',
                      isActive && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background',
                    )}
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={conv.avatar} alt="" />
                      <AvatarFallback className="text-xs font-semibold">
                        {conversationInitials(label)}
                      </AvatarFallback>
                    </Avatar>
                    {unread > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-0.5 text-[9px] font-medium text-white ring-2 ring-background">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={8}
                  className="border-border/80 bg-popover/95 px-2.5 py-1 text-xs font-medium shadow-lg backdrop-blur-sm"
                >
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-3">
        {showArchived ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setShowArchived(false)}
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="min-w-0 flex-1 text-lg font-semibold">Arquivadas</h2>
          </>
        ) : (
          <h2 className="min-w-0 truncate text-xl font-semibold tracking-tight">
            {todayLabel}
          </h2>
        )}
        <div className="flex items-center gap-0.5">
          <NewConversationDialog
            onCreated={handleCreated}
            className="h-9 w-9 rounded-full border-0 bg-transparent p-0 shadow-none hover:bg-muted"
            triggerIconOnly
          />
          <DropdownMenu
            open={headerMenuOpen}
            onOpenChange={(open) => {
              setHeaderMenuOpen(open);
              handleMenuLockChange(open);
            }}
            modal={false}
          >
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" aria-label="Menu">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-60">
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                onClick={() => setReadInBackground(!readInBackground)}
                className="flex cursor-pointer items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4 shrink-0" />
                  Leitura em segundo plano
                </span>
                <span
                  className={cn(
                    'ml-auto flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors',
                    readInBackground ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                  )}
                >
                  <span
                    className={cn(
                      'h-4 w-4 rounded-full bg-white shadow transition-transform',
                      readInBackground ? 'translate-x-4' : 'translate-x-0',
                    )}
                  />
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="shrink-0 px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar ou começar uma nova conversa"
            className="h-9 rounded-lg border-border/60 bg-muted/40 pl-9 text-sm"
            aria-label="Pesquisar conversas"
          />
        </div>
      </div>

      {!showArchived && (
        <TooltipProvider delayDuration={200}>
          <div className="shrink-0 px-3 pb-2">
            <LayoutGroup id="gechat-conversation-filters">
              <div className="flex flex-wrap gap-1.5">
                {CONVERSATION_LIST_FILTERS.map((chip) => (
                  <ConversationFilterChip
                    key={chip.id}
                    label={chip.label}
                    icon={chip.icon}
                    selected={filter === chip.id}
                    onClick={() => setFilter(chip.id)}
                  />
                ))}
              </div>
            </LayoutGroup>
          </div>
        </TooltipProvider>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto relative z-[1]">
        {!showArchived && archivedCount > 0 && (
          <button
            type="button"
            onClick={() => setShowArchived(true)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50"
          >
            <Archive className="h-5 w-5 shrink-0" />
            <span className="font-medium">Arquivadas</span>
            <span className="ml-auto text-xs tabular-nums">{archivedCount}</span>
          </button>
        )}

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={showArchived ? 'archived' : filter}
            initial={motionCfg.enabled ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={motionCfg.enabled ? { opacity: 0, y: -4 } : undefined}
            transition={{
              opacity: { duration: 0.2, ease: MOTION_EASE },
              y: motionCfg.springSoft,
            }}
          >
            {filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                {showArchived
                  ? 'Nenhuma conversa arquivada.'
                  : searchQuery.trim()
                    ? 'Nenhuma conversa encontrada.'
                    : filter === 'unread'
                      ? 'Nenhuma conversa não lida.'
                      : filter === 'favorites'
                        ? 'Nenhuma conversa favorita.'
                        : 'Nenhuma conversa ainda. Toque em + para começar.'}
              </div>
            ) : (
              <LayoutGroup id="gechat-conv-rows">
                {filtered.map((conv) => (
                  <motion.div
                    key={conv.id}
                    layout="position"
                    transition={{ type: 'spring', stiffness: 500, damping: 48, mass: 0.5 }}
                  >
                    <WhatsappConversationRow
                      conversation={conv}
                      isActive={activeConversationId === conv.id}
                      archived={showArchived}
                      onOpen={handleOpenConversation}
                      onMenuOpenChange={handleMenuLockChange}
                    />
                  </motion.div>
                ))}
              </LayoutGroup>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
