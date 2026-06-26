import { useMemo, useState } from 'react';
import { Plus, Users, Hash, Megaphone, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { gechatApi } from '@/modules/gechat/services/gechat-api';
import { databaseService } from '@/services/supabase';
import { useGeChatStore } from '@/store/gechatStore';
import { useAuthStore } from '@/store/authStore';
import type { ChannelSubtype, UserProfile } from '@/modules/gechat/types';
import { cn } from '@/lib/utils';

interface NewConversationDialogProps {
  onCreated: (conversationId: string) => void;
  className?: string;
  triggerIconOnly?: boolean;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function NewConversationDialog({ onCreated, className, triggerIconOnly }: NewConversationDialogProps) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'direct' | 'group' | 'channel'>('direct');
  const [name, setName] = useState('');
  const [channelSubtype, setChannelSubtype] = useState<ChannelSubtype>('geral');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoadingUsers(true);
    setLoadError(null);
    try {
      const { data, error } = await databaseService.listChatProfiles(currentUserId);
      if (!error && data.length > 0) {
        setUsers(data);
        return;
      }
      const fallback = await gechatApi.listUsers();
      setUsers(fallback);
      if (error && fallback.length === 0) {
        setLoadError('Não foi possível carregar os usuários. Verifique as políticas RLS em profiles.');
      }
    } catch (err) {
      console.error(err);
      try {
        const fallback = await gechatApi.listUsers();
        setUsers(fallback);
      } catch {
        setLoadError('Erro ao carregar usuários.');
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (next) {
      setSearch('');
      setSelectedUsers([]);
      void loadUsers();
    }
  };

  const filteredUsers = useMemo(() => {
    const q = normalizeSearch(search);
    if (!q) return users;
    return users.filter((u) => {
      const haystack = `${u.name} ${u.email ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [users, search]);

  const toggleUser = (id: string) => {
    if (mode === 'direct') {
      setSelectedUsers((prev) => (prev.includes(id) ? [] : [id]));
      return;
    }
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id],
    );
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      let conv;
      if (mode === 'direct') {
        const target = selectedUsers[0];
        if (!target) return;
        conv = await gechatApi.createDirect(target);
      } else if (mode === 'group') {
        conv = await gechatApi.createGroup(name, selectedUsers);
      } else {
        conv = await gechatApi.createChannel(name, channelSubtype, selectedUsers);
      }
      useGeChatStore.getState().upsertConversation(conv);
      onCreated(conv.id);
      setOpen(false);
      setName('');
      setSelectedUsers([]);
      setSearch('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const canCreate =
    mode === 'direct'
      ? selectedUsers.length === 1
      : name.trim().length > 0 && (mode === 'channel' || selectedUsers.length > 0);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={triggerIconOnly ? 'icon' : 'sm'}
          className={className ?? 'gap-1.5'}
          aria-label="Nova conversa"
        >
          <Plus className="h-4 w-4" />
          {!triggerIconOnly && 'Iniciar nova conversa'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova conversa</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === 'direct' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setMode('direct');
              setSelectedUsers([]);
            }}
          >
            <Users className="mr-1 h-3 w-3" /> Direta
          </Button>
          <Button
            type="button"
            variant={mode === 'group' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('group')}
          >
            <Users className="mr-1 h-3 w-3" /> Grupo
          </Button>
          <Button
            type="button"
            variant={mode === 'channel' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('channel')}
          >
            <Hash className="mr-1 h-3 w-3" /> Canal
          </Button>
        </div>

        {mode !== 'direct' && (
          <Input
            placeholder={mode === 'group' ? 'Nome do grupo' : 'Nome do canal'}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        {mode === 'channel' && (
          <Select value={channelSubtype} onValueChange={(v) => setChannelSubtype(v as ChannelSubtype)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="geral">Geral</SelectItem>
              <SelectItem value="setor">Setor</SelectItem>
              <SelectItem value="projeto">Projeto</SelectItem>
              <SelectItem value="avisos">
                <span className="flex items-center gap-1">
                  <Megaphone className="h-3 w-3" /> Avisos (só admin posta)
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        )}

        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            {loadingUsers ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando usuários...
              </div>
            ) : loadError ? (
              <p className="py-6 text-center text-sm text-destructive">{loadError}</p>
            ) : filteredUsers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {search.trim() ? 'Nenhum usuário encontrado.' : 'Nenhum usuário disponível.'}
              </p>
            ) : (
              filteredUsers.map((u) => {
                const selected = selectedUsers.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleUser(u.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted',
                      selected && 'bg-muted font-medium ring-1 ring-primary/30',
                    )}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={u.avatar} alt="" />
                      <AvatarFallback className="text-[10px]">{initials(u.name)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{u.name}</span>
                      {u.email && (
                        <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {!loadingUsers && users.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {filteredUsers.length} de {users.length} usuário{users.length !== 1 ? 's' : ''}
              {search.trim() ? ' na busca' : ' ativos'}
            </p>
          )}
        </div>

        <Button type="button" onClick={handleCreate} disabled={loading || !canCreate}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando...
            </>
          ) : (
            'Criar'
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
