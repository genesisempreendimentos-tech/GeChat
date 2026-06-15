import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { CVCRM_SYNC_STATUS_REFRESH_EVENT, cvcrmService } from '@/services/cvcrmService';

/** Dispara sync incremental uma vez ao montar o app autenticado (skip se sync < 2 min). */
export function useCvcrmIncrementalOnMount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || ranRef.current) return;
    ranRef.current = true;

    void cvcrmService.syncIncremental({ skipIfRecent: true }).then(({ data }) => {
      if (data && !data.skipped && (data.processed ?? 0) > 0) {
        window.dispatchEvent(new CustomEvent(CVCRM_SYNC_STATUS_REFRESH_EVENT));
      }
    });
  }, [isAuthenticated]);
}
