import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { databaseService } from '@/services/supabase';
import { COMMUNICADOS_UNREAD_CHANGED_EVENT } from '@/lib/communicadosEvents';

/** True se existir comunicado que o utilizador atual ainda não abriu (Abrir o post). */
export function useUnviewedComunicados() {
  const { user } = useAuthStore();
  const { pathname } = useLocation();
  const [hasUnviewed, setHasUnviewed] = useState(false);

  const refresh = useCallback(() => {
    if (!user?.id) {
      setHasUnviewed(false);
      return;
    }
    void databaseService.hasUnviewedStatementsForCurrentUser().then(setHasUnviewed);
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const onChanged = () => refresh();
    window.addEventListener(COMMUNICADOS_UNREAD_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(COMMUNICADOS_UNREAD_CHANGED_EVENT, onChanged);
  }, [refresh]);

  return hasUnviewed;
}
