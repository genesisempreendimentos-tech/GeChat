import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { FileText, Pin, Settings, Users, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGeChatStore } from '@/store/gechatStore';
import type { Conversation, UserProfile } from '@/modules/gechat/types';
import { PresenceBadge } from './PresenceBadge';
import { cn } from '@/lib/utils';

interface ConversationInfoPanelProps {
  conversation: Conversation;
  onClose: () => void;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function conversationTypeLabel(conversation: Conversation) {
  if (conversation.type === 'direct') return 'Conversa direta';
  if (conversation.type === 'group') return 'Grupo';
  return `Canal · ${conversation.channelSubtype ?? 'geral'}`;
}

function InfoSection({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: typeof Users;
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          {title}
        </h3>
        {typeof count === 'number' && (
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
            {count}
          </Badge>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyPlaceholder({ icon: Icon, message }: { icon: typeof FileText; message: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/80 text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <p className="text-sm leading-snug text-muted-foreground">{message}</p>
    </div>
  );
}

function MemberRow({ member, isDirect }: { member: UserProfile; isDirect?: boolean }) {
  const online = useGeChatStore((s) => s.onlineUsers[member.id]);
  const subtitle = member.email?.trim();

  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 px-3 py-2.5',
        isDirect && 'border-primary/15 bg-primary/[0.03]',
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-9 w-9">
          <AvatarImage src={member.avatar} alt="" />
          <AvatarFallback className="text-[10px]">{initials(member.name)}</AvatarFallback>
        </Avatar>
        {isDirect && (
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background',
              online ? 'bg-emerald-500' : 'bg-muted-foreground/40',
            )}
            aria-hidden
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">{member.name}</p>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {isDirect && <PresenceBadge userId={member.id} />}
    </li>
  );
}

export function ConversationInfoPanel({ conversation, onClose }: ConversationInfoPanelProps) {
  const members = useGeChatStore((s) => s.membersByConversation[conversation.id] ?? []);
  const currentUserId = useGeChatStore((s) => s.currentUser?.id);
  const onlineUsers = useGeChatStore((s) => s.onlineUsers);

  const title = useMemo(() => {
    if (conversation.type === 'direct' && conversation.otherMember?.name) {
      return conversation.otherMember.name;
    }
    return conversation.displayName ?? conversation.name ?? 'Conversa';
  }, [conversation]);

  const subtitle = useMemo(() => {
    if (conversation.type === 'direct') {
      return conversation.otherMember?.email ?? conversationTypeLabel(conversation);
    }
    return conversationTypeLabel(conversation);
  }, [conversation]);

  const avatarSrc = conversation.avatar ?? conversation.otherMember?.avatar;
  const presenceUserId =
    conversation.type === 'direct' ? conversation.otherMemberId ?? conversation.otherMember?.id : null;
  const isOtherOnline = presenceUserId ? !!onlineUsers[presenceUserId] : false;

  const sortedMembers = useMemo(() => {
    const list = [...members];
    if (conversation.type === 'direct' && conversation.otherMemberId) {
      list.sort((a, b) => {
        if (a.id === conversation.otherMemberId) return -1;
        if (b.id === conversation.otherMemberId) return 1;
        if (a.id === currentUserId) return 1;
        if (b.id === currentUserId) return -1;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }
    return list;
  }, [members, conversation, currentUserId]);

  const memberSectionTitle =
    conversation.type === 'direct' ? 'Participantes' : 'Membros';

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-border/60 bg-card/40 backdrop-blur-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-3">
        <span className="text-sm font-semibold tracking-tight">Detalhes</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground lg:hidden"
          onClick={onClose}
          aria-label="Fechar detalhes"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-muted/50 to-background px-4 pb-4 pt-5 text-center">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary/[0.06] to-transparent" />
          <div className="relative mx-auto mb-3 w-fit">
            <Avatar className="h-16 w-16 ring-2 ring-background shadow-sm">
              <AvatarImage src={avatarSrc} alt="" />
              <AvatarFallback className="text-base">{initials(title)}</AvatarFallback>
            </Avatar>
            {conversation.type === 'direct' && presenceUserId && (
              <span
                className={cn(
                  'absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background',
                  isOtherOnline ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                )}
                aria-hidden
              />
            )}
          </div>
          <p className="text-base font-semibold leading-tight tracking-tight">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          {conversation.type === 'direct' && presenceUserId && (
            <div className="mt-2.5 flex justify-center">
              <PresenceBadge userId={presenceUserId} />
            </div>
          )}
          {conversation.type !== 'direct' && (
            <Badge variant="outline" className="mt-2.5 text-[10px] font-medium capitalize">
              {conversationTypeLabel(conversation)}
            </Badge>
          )}
        </div>

        <InfoSection icon={Users} title={memberSectionTitle} count={sortedMembers.length || undefined}>
          {sortedMembers.length === 0 ? (
            <EmptyPlaceholder icon={Users} message="Carregando participantes..." />
          ) : (
            <ul className="space-y-2">
              {sortedMembers.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isDirect={
                    conversation.type === 'direct' && member.id === conversation.otherMemberId
                  }
                />
              ))}
            </ul>
          )}
        </InfoSection>

        <InfoSection icon={FileText} title="Arquivos compartilhados">
          <EmptyPlaceholder icon={FileText} message="Nenhum arquivo compartilhado ainda." />
        </InfoSection>

        <InfoSection icon={Pin} title="Mensagens fixadas">
          <EmptyPlaceholder icon={Pin} message="Nenhuma mensagem fixada." />
        </InfoSection>

        <InfoSection icon={Settings} title="Configurações">
          <div className="rounded-xl border border-border/50 bg-muted/15 px-3 py-3">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Notificações e permissões
              {conversation.type === 'channel' ? ' do canal' : conversation.type === 'group' ? ' do grupo' : ''}{' '}
              em breve.
            </p>
          </div>
        </InfoSection>
      </div>
    </aside>
  );
}
