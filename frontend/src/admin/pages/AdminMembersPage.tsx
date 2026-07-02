import { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AdminPageHeader } from '@/admin/components/AdminPageHeader';
import { AdminBigBox } from '@/admin/components/AdminBigBox';
import { AdminControlLine } from '@/admin/components/AdminControlLine';
import type { ViewMode } from '@/admin/components/ViewToggle';
import { adminApi } from '@/admin/services/admin-api';
import type { AdminUserRow } from '@/admin/types';
import { LoadingGifScreen } from '@/components/LoadingGif';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ADMIN_ENTITY_CARD } from '@/lib/translucentBigBox';

function statusLabel(status: string) {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'ativo') return 'Ativo';
  if (s === 'archived' || s === 'arquivado') return 'Arquivado';
  if (s === 'deleted' || s === 'excluído' || s === 'excluido') return 'Excluído';
  return status;
}

function accessLabel(accessType: string) {
  return accessType === 'admin' ? 'Admin' : 'Usuário';
}

function PresenceBadge({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border',
        online
          ? 'bg-primary/15 border-primary/30 text-primary'
          : 'bg-muted/50 border-border/60 text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          online ? 'bg-primary' : 'bg-muted-foreground/60',
        )}
        aria-hidden
      />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}

function UsersTable({ rows }: { rows: AdminUserRow[] }) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-muted-foreground">
            <th className="py-3 pr-4 font-medium">Usuário</th>
            <th className="py-3 pr-4 font-medium">Presença</th>
            <th className="py-3 pr-4 font-medium">Última atividade</th>
            <th className="py-3 pr-4 font-medium">Status</th>
            <th className="py-3 font-medium">Acesso</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-muted-foreground">
                Nenhum usuário encontrado.
              </td>
            </tr>
          ) : (
            rows.map((user) => (
              <tr key={user.id} className="border-b border-border/40 last:border-0">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      {user.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
                      <AvatarFallback>{user.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email ?? '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <PresenceBadge online={user.online} />
                </td>
                <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                  {user.lastSeenAt
                    ? formatDistanceToNow(new Date(user.lastSeenAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })
                    : '—'}
                </td>
                <td className="py-3 pr-4">
                  <span className="text-xs font-medium">{statusLabel(user.profileStatus)}</span>
                </td>
                <td className="py-3">
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-1 rounded-full border',
                      user.accessType === 'admin'
                        ? 'bg-primary/15 border-primary/30 text-primary'
                        : 'bg-muted/50 border-border/60 text-muted-foreground',
                    )}
                  >
                    {accessLabel(user.accessType)}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function UsersCards({ rows }: { rows: AdminUserRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
      {rows.map((user) => (
        <article
          key={user.id}
          className={cn(ADMIN_ENTITY_CARD, 'p-4 flex flex-col gap-3')}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-11 w-11 shrink-0">
              {user.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
              <AvatarFallback>{user.name.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold truncate">{user.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{user.email ?? '—'}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PresenceBadge online={user.online} />
            <span
              className={cn(
                'text-xs font-medium px-2 py-1 rounded-full border',
                user.accessType === 'admin'
                  ? 'bg-primary/15 border-primary/30 text-primary'
                  : 'bg-muted/50 border-border/60 text-muted-foreground',
              )}
            >
              {accessLabel(user.accessType)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-xs text-muted-foreground">
            <span>{statusLabel(user.profileStatus)}</span>
            <span>
              {user.lastSeenAt
                ? formatDistanceToNow(new Date(user.lastSeenAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })
                : 'Sem atividade'}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function AdminMembersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminApi.getUsers();
        if (!cancelled) {
          setUsers(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar usuários.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(q) ||
        (user.email?.toLowerCase().includes(q) ?? false),
    );
  }, [users, search]);

  if (loading) return <LoadingGifScreen />;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        icon={Users}
        title="Usuários"
        description="Lista de perfis com presença e status de acesso."
      />

      {error ? (
        <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          {error}
        </p>
      ) : null}

      <AdminBigBox>
        <AdminControlLine
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          leftContent={
            <span className="text-sm text-muted-foreground">
              {filtered.length} de {users.length} usuários
            </span>
          }
          centerContent={
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail…"
              className="max-w-md"
              aria-label="Buscar usuários"
            />
          }
        />

        {viewMode === 'table' ? (
          <UsersTable rows={filtered} />
        ) : (
          <UsersCards rows={filtered} />
        )}
      </AdminBigBox>
    </div>
  );
}
