import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { gechatApi } from '@/modules/gechat/services/gechat-api';
import { gechatSocket } from '@/lib/realtime/socket-client';
import { databaseService } from '@/services/supabase';
import { useGeChatStore } from '@/store/gechatStore';
import { useAuthStore } from '@/store/authStore';
import type { Conversation, UserProfile } from '@/modules/gechat/types';
import { cn } from '@/lib/utils';

export function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function useConversationUsers(enabled: boolean) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setSearch('');
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data, error: listError } = await databaseService.listChatProfiles(currentUserId);
        if (!cancelled && !listError && data.length > 0) {
          setUsers(data);
          return;
        }
        const fallback = await gechatApi.listUsers();
        if (!cancelled) {
          setUsers(fallback);
          if (listError && fallback.length === 0) {
            setError('Não foi possível carregar os usuários.');
          }
        }
      } catch {
        try {
          const fallback = await gechatApi.listUsers();
          if (!cancelled) setUsers(fallback);
        } catch {
          if (!cancelled) setError('Erro ao carregar usuários.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, currentUserId]);

  const filteredUsers = useMemo(() => {
    const q = normalizeSearch(search);
    if (!q) return users;
    return users.filter((u) => {
      const haystack = `${u.name} ${u.email ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [users, search]);

  return { users, filteredUsers, search, setSearch, loading, error };
}

export async function finalizeConversationCreate(
  conv: Conversation,
  onCreated: (id: string) => void,
) {
  useGeChatStore.getState().upsertConversation(conv);
  gechatSocket.joinConversation(conv.id);
  onCreated(conv.id);
}

interface ConversationUserPickerProps {
  users: UserProfile[];
  filteredUsers: UserProfile[];
  search: string;
  setSearch: (value: string) => void;
  loading: boolean;
  error: string | null;
  selectedIds: string[];
  onToggle: (id: string) => void;
  selectionMode: 'single' | 'multiple';
  emptyHint?: string;
  excludeIds?: string[];
}

export function ConversationUserPicker({
  users,
  filteredUsers,
  search,
  setSearch,
  loading,
  error,
  selectedIds,
  onToggle,
  selectionMode,
  emptyHint = 'Nenhum usuário encontrado.',
  excludeIds = [],
}: ConversationUserPickerProps) {
  const visibleUsers = useMemo(
    () => filteredUsers.filter((u) => !excludeIds.includes(u.id)),
    [filteredUsers, excludeIds],
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 border-border/60 bg-muted/30 pl-9"
        />
      </div>

      <div className="max-h-[min(280px,42vh)] overflow-y-auto rounded-xl border border-border/60 bg-muted/20">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando usuários...
          </div>
        ) : error ? (
          <p className="px-4 py-10 text-center text-sm text-destructive">{error}</p>
        ) : visibleUsers.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyHint}</p>
        ) : (
          <ul className="divide-y divide-border/40 p-1.5">
            {visibleUsers.map((user) => {
              const selected = selectedIds.includes(user.id);
              return (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => onToggle(user.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors',
                      'hover:bg-background/80',
                      selected && 'bg-background shadow-sm ring-1 ring-primary/25',
                    )}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={user.avatar} alt="" />
                      <AvatarFallback className="text-[10px]">{initials(user.name)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{user.name}</span>
                      {user.email && (
                        <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                      )}
                    </span>
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border/80 bg-background',
                        selectionMode === 'single' && 'rounded-full',
                        selectionMode === 'multiple' && 'rounded-md',
                      )}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!loading && users.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {visibleUsers.length} de {users.length - excludeIds.length} usuário
          {users.length - excludeIds.length !== 1 ? 's' : ''}
          {search.trim() ? ' na busca' : ''}
        </p>
      )}
    </div>
  );
}

export function SelectedMemberChips({
  users,
  selectedIds,
  onRemove,
}: {
  users: UserProfile[];
  selectedIds: string[];
  onRemove: (id: string) => void;
}) {
  if (!selectedIds.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {selectedIds.map((id) => {
        const user = users.find((u) => u.id === id);
        if (!user) return null;
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 py-0.5 pl-1 pr-2 text-xs font-medium text-foreground"
          >
            <Avatar className="h-5 w-5">
              <AvatarImage src={user.avatar} alt="" />
              <AvatarFallback className="text-[8px]">{initials(user.name)}</AvatarFallback>
            </Avatar>
            <span className="max-w-[120px] truncate">{user.name}</span>
            <button
              type="button"
              onClick={() => onRemove(id)}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-primary/15 hover:text-foreground"
              aria-label={`Remover ${user.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
    </div>
  );
}
