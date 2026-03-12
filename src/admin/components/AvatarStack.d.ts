import type { ReactNode } from 'react';

export interface AvatarStackUser {
  id: string;
  name?: string;
  avatar?: string;
}

export interface AvatarStackProps {
  users?: AvatarStackUser[];
  avatarSize?: number;
  maxDisplay?: number;
  className?: string;
}

declare const AvatarStack: (props: AvatarStackProps) => ReactNode;
export default AvatarStack;
