import { useEffect, useMemo, useState } from 'react';
import { Lock, MessagesSquare, Users } from 'lucide-react';
import { AdminPageHeader } from '@/admin/components/AdminPageHeader';
import { AdminBigBox } from '@/admin/components/AdminBigBox';
import { AdminControlLine } from '@/admin/components/AdminControlLine';
import type { ViewMode } from '@/admin/components/ViewToggle';
import { adminApi } from '@/admin/services/admin-api';
import type { AdminConversationRow } from '@/admin/types';
import { formatShortRef } from '@/admin/lib/formatShortRef';
import { LoadingGifScreen } from '@/components/LoadingGif';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ADMIN_ENTITY_CARD } from '@/lib/translucentBigBox';
import { formatLeadDateCreated } from '@/lib/formatDateTime';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AdminConversationViewerDialog } from '@/admin/components/AdminConversationViewerDialog';

type ConversationFilter = 'all' | 'direct' | 'group' | 'channel';

function typeLabel(type: AdminConversationRow['type']) {
  if (type === 'direct') return 'Direta';
  if (type === 'group') return 'Grupo';
  return 'Canal';
}

function matchesSearch(conv: AdminConversationRow, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    conv.displayName,
    conv.memberNames,
    conv.id,
    formatShortRef(conv.id),
    ...(conv.members ?? []).map((m) => m.name),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function ConversationRef({ id }: { id: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-[11px] text-muted-foreground/80 tabular-nums tracking-wide cursor-default">
          {formatShortRef(id)}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="font-mono text-xs">
        {id}
      </TooltipContent>
    </Tooltip>
  );
}

function ConversationsTable({
  rows,
  onSelect,
}: {
  rows: AdminConversationRow[];
  onSelect: (conv: AdminConversationRow) => void;
}) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-muted-foreground">
            <th className="py-3 pr-4 font-medium">Tipo</th>
            <th className="py-3 pr-4 font-medium">Nome</th>
            <th className="py-3 pr-4 font-medium">Participantes</th>
            <th className="py-3 pr-4 font-medium">Membros</th>
            <th className="py-3 pr-4 font-medium">Última mensagem</th>
            <th className="py-3 font-medium">Restrito</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-muted-foreground">
                Nenhuma conversa encontrada.
              </td>
            </tr>
          ) : (
            rows.map((conv) => (
              <tr
                key={conv.id}
                className="border-b border-border/40 last:border-0 cursor-pointer transition-colors hover:bg-muted/40"
                onClick={() => onSelect(conv)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(conv);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Visualizar conversa ${conv.displayName}`}
              >
                <td className="py-3 pr-4">
                  <span className="text-xs font-medium px-2 py-1 rounded-full border bg-muted/40 border-border/60">
                    {typeLabel(conv.type)}
                    {conv.channelSubtype ? ` · ${conv.channelSubtype}` : ''}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <p className="font-medium">{conv.displayName}</p>
                  <ConversationRef id={conv.id} />
                </td>
                <td className="py-3 pr-4 text-muted-foreground max-w-[280px]">
                  <p className="truncate" title={conv.memberNames || '—'}>
                    {conv.memberNames || '—'}
                  </p>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{conv.memberCount}</td>
                <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                  {conv.lastMessageAt
                    ? formatLeadDateCreated(conv.lastMessageAt)
                    : 'Sem mensagens'}
                </td>
                <td className="py-3">
                  {conv.onlyAdminsCanSend ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500">
                      <Lock className="w-3.5 h-3.5" aria-hidden />
                      Sim
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Não</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ConversationsCards({
  rows,
  onSelect,
}: {
  rows: AdminConversationRow[];
  onSelect: (conv: AdminConversationRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
      {rows.map((conv) => (
        <article
          key={conv.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(conv)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(conv);
            }
          }}
          aria-label={`Visualizar conversa ${conv.displayName}`}
          className={cn(
            ADMIN_ENTITY_CARD,
            'p-4 flex flex-col gap-3 cursor-pointer hover:border-primary/40 hover:shadow-lg',
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-primary/10 border-primary/25 text-primary shrink-0">
              {typeLabel(conv.type)}
              {conv.channelSubtype ? ` · ${conv.channelSubtype}` : ''}
            </span>
            <ConversationRef id={conv.id} />
          </div>
          <div>
            <h3 className="font-semibold leading-snug">{conv.displayName}</h3>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 shrink-0" aria-hidden />
              {conv.memberCount} {conv.memberCount === 1 ? 'membro' : 'membros'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 border border-border/60 px-3 py-2.5 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Participantes
            </p>
            <p className="text-foreground/90 line-clamp-2">{conv.memberNames || '—'}</p>
          </div>
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
            <span>
              {conv.lastMessageAt
                ? formatLeadDateCreated(conv.lastMessageAt)
                : 'Sem mensagens'}
            </span>
            {conv.onlyAdminsCanSend ? (
              <span className="inline-flex items-center gap-1 font-medium text-amber-500">
                <Lock className="w-3 h-3" aria-hidden />
                Restrito
              </span>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

export default function AdminConversationsPage() {
  const [conversations, setConversations] = useState<AdminConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminApi.getConversations(100);
        if (!cancelled) {
          setConversations(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar conversas.');
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
    return conversations.filter((conv) => {
      if (filter !== 'all' && conv.type !== filter) return false;
      return matchesSearch(conv, search);
    });
  }, [conversations, filter, search]);

  const openViewer = (conv: AdminConversationRow) => {
    setViewerId(conv.id);
    setViewerTitle(conv.displayName);
  };

  if (loading) return <LoadingGifScreen />;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        icon={MessagesSquare}
        title="Conversas"
        description="Metadados das conversas do GêChat (sem conteúdo das mensagens)."
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
              {filtered.length} de {conversations.length} conversas
            </span>
          }
          centerContent={
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, participante ou ref…"
              className="max-w-md"
              aria-label="Buscar conversas"
            />
          }
          rightContent={
            <Select value={filter} onValueChange={(v) => setFilter(v as ConversationFilter)}>
              <SelectTrigger className="w-[160px]" aria-label="Filtrar por tipo">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="direct">Diretas</SelectItem>
                <SelectItem value="group">Grupos</SelectItem>
                <SelectItem value="channel">Canais</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {viewMode === 'table' ? (
          <ConversationsTable rows={filtered} onSelect={openViewer} />
        ) : (
          <ConversationsCards rows={filtered} onSelect={openViewer} />
        )}
      </AdminBigBox>

      <AdminConversationViewerDialog
        conversationId={viewerId}
        open={Boolean(viewerId)}
        onOpenChange={(open) => {
          if (!open) {
            setViewerId(null);
            setViewerTitle(undefined);
          }
        }}
        previewTitle={viewerTitle}
      />
    </div>
  );
}
