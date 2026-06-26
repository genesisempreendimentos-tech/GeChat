import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { SIDEBAR_ICON_COLUMN_WIDTH } from '@/components/layout/SidebarNavItem';
import type { Conversation } from '@/modules/gechat/types';
import { useGeChatStore } from '@/store/gechatStore';

const HIGHLIGHT_EASE = [0.4, 0, 0.2, 1] as const;

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

interface SidebarConversationNavItemProps {
  conversation: Conversation;
  isActive: boolean;
  isExpanded: boolean;
}

export function SidebarConversationNavItem({
  conversation,
  isActive,
  isExpanded,
}: SidebarConversationNavItemProps) {
  const [hovered, setHovered] = useState(false);
  const unread = useGeChatStore((s) => s.unreadCounters[conversation.id] ?? 0);
  const onlineUsers = useGeChatStore((s) => s.onlineUsers);
  const typingUsers = useGeChatStore((s) => s.typingUsersByConversation[conversation.id] ?? []);
  const currentUserId = useGeChatStore((s) => s.currentUser?.id);
  const isTyping = typingUsers.some((id) => id !== currentUserId);

  const label = conversation.displayName ?? conversation.name ?? 'Conversa';
  const isOnline =
    conversation.type === 'direct' && conversation.otherMemberId
      ? onlineUsers[conversation.otherMemberId]
      : false;

  const visible = isActive || hovered;

  return (
    <Link
      to={`/c/${conversation.id}`}
      className="group relative block h-12"
      title={label}
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isExpanded && (
        <motion.div
          layout
          initial={false}
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-0 left-2 right-2 rounded-xl',
            isActive ? 'bg-primary' : 'bg-accent/75',
          )}
          animate={{ opacity: visible ? (isActive ? 1 : 0.82) : 0, scale: visible ? 1 : 0.94 }}
          transition={{ opacity: { duration: 0.28, ease: HIGHLIGHT_EASE }, scale: { duration: 0.28, ease: HIGHLIGHT_EASE } }}
        />
      )}

      <div className="relative z-[1] flex h-12 items-center">
        <div
          className="relative flex h-12 shrink-0 items-center justify-center"
          style={{ width: SIDEBAR_ICON_COLUMN_WIDTH }}
        >
          {!isExpanded && (
            <motion.div
              initial={false}
              aria-hidden
              className={cn('pointer-events-none absolute rounded-xl', isActive ? 'bg-primary' : 'bg-accent/75')}
              style={{ left: 6, right: 6, top: 2, height: 44 }}
              animate={{ opacity: visible ? (isActive ? 1 : 0.82) : 0, scale: visible ? 1 : 0.94 }}
              transition={{ opacity: { duration: 0.28, ease: HIGHLIGHT_EASE }, scale: { duration: 0.28, ease: HIGHLIGHT_EASE } }}
            />
          )}
          <span className="relative z-[1]">
            <Avatar className="h-8 w-8">
              <AvatarImage src={conversation.avatar} alt="" />
              <AvatarFallback className="text-[10px]">{initials(label)}</AvatarFallback>
            </Avatar>
            {isOnline && (
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-background bg-emerald-500" />
            )}
            {unread > 0 && !isExpanded && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-medium text-primary-foreground">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </span>
        </div>
        <motion.div
          className="flex min-w-0 flex-1 items-center justify-between gap-2 pr-3"
          initial={false}
          animate={{ opacity: isExpanded ? 1 : 0, maxWidth: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.28, ease: HIGHLIGHT_EASE }}
          aria-hidden={!isExpanded}
        >
          <span
            className={cn(
              'truncate text-sm font-medium',
              isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground',
            )}
          >
            {label}
          </span>
          {unread > 0 && (
            <Badge variant={isActive ? 'secondary' : 'default'} className="h-5 min-w-5 shrink-0 justify-center px-1 text-[10px]">
              {unread > 99 ? '99+' : unread}
            </Badge>
          )}
        </motion.div>
      </div>
      {isExpanded && isTyping && (
        <p className="pointer-events-none absolute bottom-0.5 left-[5.5rem] truncate pr-3 text-[10px] italic text-muted-foreground">
          digitando...
        </p>
      )}
    </Link>
  );
}
