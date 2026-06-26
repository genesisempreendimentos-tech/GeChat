import { useMemo } from 'react';
import { Hash, MessageSquare, Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ConversationList } from './ConversationList';
import { NewConversationDialog } from './NewConversationDialog';
import type { Conversation } from '@/modules/gechat/types';
import { useGeChatStore } from '@/store/gechatStore';

interface GeChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  onCreated: (id: string) => void;
  className?: string;
}

function filterConversations(list: Conversation[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((c) => {
    const name = (c.displayName ?? c.name ?? '').toLowerCase();
    const preview = c.lastMessage?.content?.toLowerCase() ?? '';
    return name.includes(q) || preview.includes(q);
  });
}

function SectionHeader({
  icon: Icon,
  label,
  count,
  unread,
}: {
  icon: typeof MessageSquare;
  label: string;
  count: number;
  unread: number;
}) {
  return (
    <div className="flex items-center justify-between px-3 pb-1 pt-3">
      <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
        <span className="font-normal">({count})</span>
      </h2>
      {unread > 0 && (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </div>
  );
}

export function GeChatSidebar({
  conversations,
  activeId,
  searchQuery,
  onSearchChange,
  onSelect,
  onCreated,
  className,
}: GeChatSidebarProps) {
  const unreadCounters = useGeChatStore((s) => s.unreadCounters);

  const filtered = useMemo(
    () => filterConversations(conversations, searchQuery),
    [conversations, searchQuery],
  );

  const direct = filtered.filter((c) => c.type === 'direct');
  const groups = filtered.filter((c) => c.type === 'group');
  const channels = filtered.filter((c) => c.type === 'channel');

  const sumUnread = (list: Conversation[]) =>
    list.reduce((acc, c) => acc + (unreadCounters[c.id] ?? 0), 0);

  return (
    <aside
      className={cn(
        'flex h-full w-full max-w-[320px] shrink-0 flex-col border-r border-border/60 bg-card/40 md:w-80',
        className,
      )}
    >
      <div className="space-y-3 border-b border-border/60 p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">GêChat</p>
            <p className="text-[11px] text-muted-foreground">Comunicação interna</p>
          </div>
        </div>

        <div className="relative md:hidden">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar conversas..."
            className="h-9 pl-9"
          />
        </div>

        <NewConversationDialog onCreated={onCreated} className="w-full justify-center gap-1.5" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {direct.length > 0 && (
          <>
            <SectionHeader
              icon={MessageSquare}
              label="Conversas"
              count={direct.length}
              unread={sumUnread(direct)}
            />
            <ConversationList conversations={direct} activeId={activeId} onSelect={onSelect} compact />
          </>
        )}

        {groups.length > 0 && (
          <>
            <SectionHeader icon={Users} label="Grupos" count={groups.length} unread={sumUnread(groups)} />
            <ConversationList conversations={groups} activeId={activeId} onSelect={onSelect} compact />
          </>
        )}

        {channels.length > 0 && (
          <>
            <SectionHeader icon={Hash} label="Canais" count={channels.length} unread={sumUnread(channels)} />
            <ConversationList conversations={channels} activeId={activeId} onSelect={onSelect} compact />
          </>
        )}

        {filtered.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {searchQuery.trim() ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa ainda. Crie uma nova.'}
          </div>
        )}
      </div>
    </aside>
  );
}
