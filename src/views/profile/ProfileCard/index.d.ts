import type { ReactNode } from 'react';

export interface ProfileCardUser {
  name?: string;
  apelido?: string;
  email?: string;
  avatar?: string;
  username?: string;
}

export interface ProfileCardProps {
  className?: string;
  enableTilt?: boolean;
  enableMobileTilt?: boolean;
  mobileTiltSensitivity?: number;
  showUserInfo?: boolean;
  iconUrl?: string;
  innerGradient?: string;
  behindGlowEnabled?: boolean;
  behindGlowColor?: string;
  behindGlowSize?: string;
  userData?: ProfileCardUser | null;
}

declare const ProfileCard: (props: ProfileCardProps) => ReactNode;
export default ProfileCard;
