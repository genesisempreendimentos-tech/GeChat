import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Monitor, ChevronDown, ShieldCheck, Clock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { databaseService } from '@/services/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LoadingGif } from '@/components/LoadingGif';

export function ProfileActivitiesTab() {
  const { user: currentUser } = useAuthStore();
  const [openBox, setOpenBox] = useState<'recent' | 'sessions' | null>(null);
  const [recentLogsFromApi, setRecentLogsFromApi] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!currentUser?.id) {
        setRecentLogsFromApi([]);
        setLoadingLogs(false);
        return;
      }
      setLoadingLogs(true);
      const { data } = await databaseService.getAccessLogs(currentUser.id, 5);
      setRecentLogsFromApi(data ?? []);
      setLoadingLogs(false);
    };
    void load();
  }, [currentUser?.id]);

  const recentLogs = useMemo(
    () =>
      recentLogsFromApi.map((log: any) => ({
        id: String(log.id ?? `${log.app_id ?? ''}_${log.user_id ?? ''}_${log.timestamp ?? ''}`),
        systemName: log.systemName ?? log.systems?.name ?? 'Sistema',
        timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
      })),
    [recentLogsFromApi]
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Box 1: Atividade Recente (mesmo conceito do dashboard) */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/20">
          <button
            type="button"
            onClick={() => setOpenBox((v) => (v === 'recent' ? null : 'recent'))}
            className="w-full text-left"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <Clock className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Atividade Recente</p>
                  <p className="text-xs text-muted-foreground">Seus últimos acessos aos aplicativos</p>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${openBox === 'recent' ? 'rotate-180' : ''}`}
              />
            </div>
          </button>
          <AnimatePresence initial={false}>
            {openBox === 'recent' && (
              <motion.div
                key="recent-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="space-y-0 border-t border-border/40 px-5 pb-5 pt-2">
                  {loadingLogs ? (
                    <div className="flex justify-center py-8">
                      <LoadingGif size="sm" />
                    </div>
                  ) : recentLogs.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma atividade recente</p>
                  ) : (
                    <div className="flex flex-col gap-0">
                      {recentLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                        >
                          <div>
                            <p className="text-sm font-medium">{log.systemName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(log.timestamp, {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                          <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Box 2: Sessões e dispositivos */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/20">
          <button
            type="button"
            onClick={() => setOpenBox((v) => (v === 'sessions' ? null : 'sessions'))}
            className="w-full text-left"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
                  <Monitor className="h-4 w-4 text-sky-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Sessões e dispositivos</p>
                  <p className="text-xs text-muted-foreground">Dispositivos conectados à conta</p>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${openBox === 'sessions' ? 'rotate-180' : ''}`}
              />
            </div>
          </button>
          <AnimatePresence initial={false}>
            {openBox === 'sessions' && (
              <motion.div
                key="sessions-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="border-t border-border/40 px-5 pb-5 pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-sky-500/60" />
                    <p className="text-sm">Em breve você poderá ver e encerrar sessões ativas aqui.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
