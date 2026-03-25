import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarGroup, AvatarGroupItem } from '@/components/ui/avatar-group';
import { cn } from '@/lib/utils';

export type AppAccessUserPreview = {
  id: string;
  name: string;
  avatar?: string;
};

export interface AppAccessAvatarRowProps {
  users: AppAccessUserPreview[];
  /** Quantidade máxima de rostos antes do chip +n (padrão: 4). */
  maxVisible?: number;
  className?: string;
  avatarClassName?: string;
  /** Abre o card de perfil (mesmo fluxo das equipes). */
  onUserClick?: (user: AppAccessUserPreview) => void;
  /** Ex.: abrir modal “Acessos” do app quando o usuário clica em +n. */
  onOverflowClick?: () => void;
  loadingUserId?: string | null;
}

/**
 * Rodapé de card de aplicativo: quem tem acesso, usando o {@link AvatarGroup} padrão do produto.
 */
export function AppAccessAvatarRow({
  users,
  maxVisible = 4,
  className,
  avatarClassName,
  onUserClick,
  onOverflowClick,
  loadingUserId = null,
}: AppAccessAvatarRowProps) {
  const list = Array.isArray(users) ? users : [];
  if (list.length === 0) return null;

  const shown = list.slice(0, maxVisible);
  const overflow = list.length - maxVisible;

  return (
    <AvatarGroup className={cn('justify-start', className)}>
      {shown.map((user, i) => (
        <AvatarGroupItem
          key={user.id || `u-${i}`}
          tooltip={user.name || 'Colaborador'}
          loading={loadingUserId === user.id}
          onClick={onUserClick ? () => onUserClick(user) : undefined}
        >
          <Avatar
            className={cn('border-2 border-background', avatarClassName ?? 'h-[26px] w-[26px]')}
          >
            <AvatarImage src={user.avatar} className="object-cover" />
            <AvatarFallback className="text-[10px]">
              {(user.name || '?').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </AvatarGroupItem>
      ))}
      {overflow > 0 ? (
        <AvatarGroupItem
          tooltip={`+${overflow} colaboradores`}
          onClick={onOverflowClick}
        >
          <Avatar className={cn('border-2 border-background', avatarClassName ?? 'h-[26px] w-[26px]')}>
            <AvatarFallback className="bg-muted text-[9px] font-medium text-muted-foreground">
              +{overflow}
            </AvatarFallback>
          </Avatar>
        </AvatarGroupItem>
      ) : null}
    </AvatarGroup>
  );
}
