import { useEffect, useState } from 'react';
import { checkAppHubAccess, initGeChatAudit, stopGeChatAudit } from '@/lib/auditLog';

export function useAppHubAudit(enabled: boolean) {
  const [hubState, setHubState] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    if (!enabled) {
      setHubState('loading');
      return;
    }

    let cancelled = false;
    checkAppHubAccess()
      .then((result) => {
        if (!cancelled) setHubState(result.allowed ? 'allowed' : 'denied');
      })
      .catch(() => {
        if (!cancelled) setHubState('denied');
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || hubState !== 'allowed') return;
    const cleanup = initGeChatAudit();
    return () => {
      cleanup?.();
      stopGeChatAudit();
    };
  }, [enabled, hubState]);

  return hubState;
}
