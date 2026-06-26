import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useGeChatStore } from '@/store/gechatStore';

interface PresenceBadgeProps {
  userId?: string | null;
}

export function PresenceBadge({ userId }: PresenceBadgeProps) {
  const online = useGeChatStore((s) => (userId ? s.onlineUsers[userId] : false));
  const presence = useGeChatStore((s) => (userId ? s.presenceByUser[userId] : undefined));
  const lastSeen = presence?.lastSeenAt;
  const presenceHidden = presence?.presenceHidden;

  if (!userId || presenceHidden) return null;

  if (online) {
    return <Badge variant="success" className="text-[10px]">Online</Badge>;
  }

  if (lastSeen) {
    const label = formatDistanceToNow(new Date(lastSeen), { addSuffix: true, locale: ptBR });
    return (
      <Badge variant="secondary" className="text-[10px]">
        Visto {label}
      </Badge>
    );
  }

  return <Badge variant="secondary" className="text-[10px]">Offline</Badge>;
}
