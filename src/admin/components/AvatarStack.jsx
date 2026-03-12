import React from 'react';
import { cn } from '@/lib/utils';

/**
 * AvatarStack – exibe avatares dos colaboradores com acesso ao SaaS em formato empilhado.
 * Inspirado no estilo react-avatar-stack: avatares sobrepostos, compactos, com hover que destaca o avatar.
 *
 * @param {Array<{ id: string, name?: string, avatar?: string }>} users - Lista de usuários com acesso
 * @param {number} [avatarSize=32] - Tamanho em px de cada avatar
 * @param {number} [maxDisplay=6] - Quantidade máxima de avatares visíveis antes do "+n"
 * @param {string} [className] - Classes adicionais no container
 */
export default function AvatarStack({
  users = [],
  avatarSize = 32,
  maxDisplay = 6,
  className,
}) {
  const list = Array.isArray(users) ? users : [];
  const visible = list.slice(0, maxDisplay);
  const overflowCount = list.length - maxDisplay;

  if (list.length === 0) return null;

  const overlap = avatarSize / 2;

  return (
    <div
      className={cn('flex flex-shrink-0 items-center', className)}
      style={{ '--avatar-size': `${avatarSize}px`, '--overlap': `${-overlap}px` }}
    >
      {visible.map((user, index) => (
        <div
          key={user.id ?? index}
          className="relative rounded-full border-2 border-background bg-muted overflow-hidden cursor-default transition-[margin] duration-150 hover:z-10 hover:!ml-0 hover:mr-1"
          style={{
            width: avatarSize,
            height: avatarSize,
            minWidth: avatarSize,
            zIndex: index + 1,
            marginLeft: index === 0 ? 0 : -overlap,
          }}
          title={user.name ?? 'Colaborador'}
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span
              className="w-full h-full flex items-center justify-center text-xs font-medium text-muted-foreground bg-primary/10"
              aria-hidden
            >
              {(user.name ?? '?').trim().charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      ))}
      {overflowCount > 0 && (
        <div
          className="rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground transition-[margin] duration-150 hover:z-10 hover:!ml-0 hover:mr-1"
          style={{
            width: avatarSize,
            height: avatarSize,
            minWidth: avatarSize,
            zIndex: visible.length + 2,
            marginLeft: -overlap,
          }}
          title={`+${overflowCount} colaborador(es)`}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}
