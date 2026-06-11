import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  CVCRM_SYNC_STATUS_REFRESH_EVENT,
  cvcrmService,
  formatCvcrmSyncStatusLabel,
} from '@/services/cvcrmService';

type CvcrmSyncStatusIndicatorProps = {
  className?: string;
};

export function CvcrmSyncStatusIndicator({ className }: CvcrmSyncStatusIndicatorProps) {
  const [label, setLabel] = useState('Nunca sincronizado');

  const loadStatus = useCallback(async () => {
    const { data, error } = await cvcrmService.getSyncStatus();
    if (!error && data) {
      setLabel(formatCvcrmSyncStatusLabel(data.last_sync_at, data.last_processed));
    }
  }, []);

  useEffect(() => {
    void loadStatus();

    const intervalId = window.setInterval(() => {
      void loadStatus();
    }, 60_000);

    const onFocus = () => {
      void loadStatus();
    };

    const onRefresh = () => {
      void loadStatus();
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener(CVCRM_SYNC_STATUS_REFRESH_EVENT, onRefresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(CVCRM_SYNC_STATUS_REFRESH_EVENT, onRefresh);
    };
  }, [loadStatus]);

  return (
    <p
      className={cn(
        'truncate text-xs text-muted-foreground sm:text-sm',
        className,
      )}
      title={label}
    >
      {label}
    </p>
  );
}
