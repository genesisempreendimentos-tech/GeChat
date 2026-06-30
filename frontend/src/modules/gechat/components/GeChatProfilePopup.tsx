import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import ProfileCardInfoPopup from '@/components/profile/ProfileCard/ProfileCardInfoPopup';
import { databaseService } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';

interface GeChatProfilePopupProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GeChatProfilePopup({ userId, open, onOpenChange }: GeChatProfilePopupProps) {
  const currentUser = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setProfile(null);

    void databaseService.getProfileForPopupByUserId(userId).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        toast.error('Não foi possível carregar o perfil.');
        onOpenChange(false);
        setLoading(false);
        return;
      }
      setProfile(data as Record<string, unknown>);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, userId, onOpenChange]);

  if (!open || loading || !profile) return null;

  return (
    <ProfileCardInfoPopup
      open={open}
      onOpenChange={onOpenChange}
      userData={profile}
      currentUser={currentUser}
    />
  );
}
