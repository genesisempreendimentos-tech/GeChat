import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { databaseService, FAVORITE_LIMIT_ERROR_CODE } from '@/services/supabase';
import { FavoriteLimitDialog } from '@/components/FavoriteLimitDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityChart, SystemUsageChart } from '@/components/Charts';
import { LoadingGif, LoadingGifScreen } from '@/components/LoadingGif';
import { Badge } from '@/components/ui/badge';
import {
  Star,
  Activity,
  ExternalLink,
  Clock,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, subDays, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { System } from '@/types';
import { ComingSoonModal } from '@/components/ComingSoonModal';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { emitFavoritesChanged } from '@/lib/favoritesEvents';

/** Slots visuais fixos na secção «Aplicativos Favoritos» do dashboard. */
const FAVORITE_DISPLAY_SLOTS = 5;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

/** Soma de `screen_time_active` (ms) → texto tipo "12h 05m". */
function formatForegroundScreenTime(ms: number): string {
  const safe = Math.max(0, Math.floor(ms));
  const totalMin = Math.floor(safe / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [systems, setSystems] = useState<System[]>([]);
  const [userAccesses, setUserAccesses] = useState<any[]>([]);
  const [totalAccessCount, setTotalAccessCount] = useState<number>(0);
  const [foregroundScreenMs, setForegroundScreenMs] = useState<number>(0);
  const [allAccessLogs, setAllAccessLogs] = useState<any[]>([]);
  const [recentLogsFromApi, setRecentLogsFromApi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteTogglingId, setFavoriteTogglingId] = useState<string | null>(null);
  const [favoriteLimitOpen, setFavoriteLimitOpen] = useState(false);
  const [comingSoonSystem, setComingSoonSystem] = useState<System | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Mesma regra da SystemsPage: apenas apps ativos/beta com acesso liberado ao usuário (inclui admin no painel usuário).
      const { data: systemsData, error: systemsError } = await databaseService.getSystemsForMember(user.id);
      if (systemsError) console.error('Erro ao carregar aplicativos:', systemsError);
      setSystems(systemsData || []);

      const { data: accessData, error: accessError } = await databaseService.getUserSystemAccess(user.id);
      if (accessError) console.error('Erro ao carregar acessos:', accessError);
      setUserAccesses(accessData || []);

      const [total, foregroundMs, { data: logsAll }, { data: recentLogs }] = await Promise.all([
        databaseService.getUserAccessCount(user.id),
        databaseService.getUserForegroundScreenTimeMsForGeNovo(user.id),
        databaseService.getAccessLogs(user.id, 500),
        databaseService.getAccessLogs(user.id, 5),
      ]);
      setTotalAccessCount(total);
      setForegroundScreenMs(foregroundMs);
      setAllAccessLogs(logsAll || []);
      setRecentLogsFromApi(recentLogs || []);
    } catch (error) {
      console.error('Erro geral ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const favoriteSystems = useMemo(() => {
    const hasAccess = (a: any) => a.access !== false && a.can_access !== false;
    const favoriteIds = userAccesses
      .filter(
        (access: any) => !!(access.is_favorite ?? access.favorite) && hasAccess(access)
      )
      .map((access: any) => access.system_id);
    return systems.filter((system) => favoriteIds.includes(system.id));
  }, [systems, userAccesses]);

  const favoriteDashboardSlots = useMemo(() => {
    const real = favoriteSystems.slice(0, FAVORITE_DISPLAY_SLOTS);
    const placeholderCount = FAVORITE_DISPLAY_SLOTS - real.length;
    return { real, placeholderCount };
  }, [favoriteSystems]);

  const toggleFavorite = async (systemId: string) => {
    if (!user?.id) return;
    setFavoriteTogglingId(systemId);
    const { error } = await databaseService.toggleFavorite(user.id, systemId);
    if (error && typeof error === 'object' && (error as { code?: string }).code === FAVORITE_LIMIT_ERROR_CODE) {
      setFavoriteLimitOpen(true);
    } else {
      emitFavoritesChanged();
      await loadData();
      if (error) console.error('Erro ao favoritar:', error);
    }
    setFavoriteTogglingId(null);
  };
  const recentLogs = useMemo(() => {
    return recentLogsFromApi.map((log: any) => ({
      id: log.id ?? log.app_id + log.user_id,
      systemName: log.systemName ?? log.systems?.name ?? 'Sistema',
      timestamp: new Date(log.created_at ?? log.timestamp ?? Date.now()),
    }));
  }, [recentLogsFromApi]);

  // Gráficos: só `app_access_daily` do utilizador logado (actor_user_id), datas em created_at
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, 'dd/MM'),
        fullDate: startOfDay(date),
        acessos: 0,
      };
    });

    allAccessLogs.forEach((log: any) => {
      const ts = log.created_at ?? log.timestamp;
      if (!ts) return;
      const logDate = startOfDay(new Date(ts));
      const dayData = last7Days.find((day) => day.fullDate.getTime() === logDate.getTime());
      if (dayData) dayData.acessos++;
    });

    return last7Days.map(({ date, acessos }) => ({ date, acessos }));
  }, [allAccessLogs]);

  const systemUsageData = useMemo(() => {
    const systemCounts: Record<string, { name: string; count: number }> = {};
    allAccessLogs.forEach((log: any) => {
      const id = log.systemId ?? log.app_id;
      if (!id) return;
      if (!systemCounts[id]) {
        systemCounts[id] = {
          name: log.systemName ?? log.systems?.name ?? 'Sistema',
          count: 0,
        };
      }
      systemCounts[id].count++;
    });
    return Object.values(systemCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item) => ({ name: item.name, acessos: item.count }));
  }, [allAccessLogs]);

  const stats = useMemo(
    () => [
      {
        title: 'Item 1 disponível',
        value: systems.length,
        icon: Boxes,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        trend: null as number | null,
      },
      {
        title: 'Item 4',
        value: favoriteSystems.length,
        icon: Star,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        trend: null as number | null,
      },
      {
        title: 'Seus acessos',
        value: totalAccessCount,
        icon: Activity,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        trend: null as number | null,
      },
      {
        title: 'Tempo de Tela',
        value: formatForegroundScreenTime(foregroundScreenMs),
        icon: Monitor,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        trend: null as number | null,
      },
    ],
    [systems.length, favoriteSystems.length, totalAccessCount, foregroundScreenMs]
  );

  const handleSystemAccess = (systemId: string, url: string) => {
    const system = systems.find(s => s.id === systemId);
    if (system && (system.status === 'beta' || system.status === 'rascunho')) {
      setComingSoonSystem(system);
      return;
    }
    window.open(url, '_blank');
  };

  const renderIcon = (iconPath: string, className: string = '') => {
    // Se for URL ou caminho (SVG, PNG, etc.) da tabela apps, renderizar <img>
    const isImg = iconPath?.startsWith('http') || iconPath?.startsWith('/') || iconPath?.endsWith('.svg') || iconPath?.endsWith('.png') || iconPath?.endsWith('.jpg') || iconPath?.endsWith('.jpeg');
    if (isImg) {
      return <img src={iconPath} alt="System icon" className={className} />;
    }
    // Caso contrário, usar ícone Lucide
    const Icon = (Icons as any)[iconPath];
    const IconComponent = Icon || Boxes;
    return <IconComponent className={className} />;
  };

  const getTrendIcon = (trend: number | null) => {
    if (trend === null) return null;
    if (trend > 0) return <ArrowUpRight className="w-3 h-3" />;
    if (trend < 0) return <ArrowDownRight className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = (trend: number | null) => {
    if (trend === null) return '';
    if (trend > 0) return 'text-success';
    if (trend < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <MainViewFluidShell>
    <div className="space-y-6">
      <div className="flex items-center justify-between" data-tour="dashboard-welcome">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Bem-vindo, {user?.name?.split(' ')[0]}! Aqui está um resumo do seu Item 1 e das atividades recentes.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
          >
            {loading ? <LoadingGif size="sm" className="mr-2 inline-block" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Atualizar
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingGifScreen className="h-64" />
      ) : (
        <>
      {/* Stats */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        data-tour="dashboard-stats"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.title} variants={item}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <div className="flex items-baseline gap-2 mt-2">
                        <p className="text-3xl font-bold">{stat.value}</p>
                        {stat.trend !== null && (
                          <div className={`flex items-center text-xs font-medium ${getTrendColor(stat.trend)}`}>
                            {getTrendIcon(stat.trend)}
                            <span>{Math.abs(stat.trend).toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                      {stat.trend !== null && (
                        <p className="text-xs text-muted-foreground mt-1"></p>
                      )}
                    </div>
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-tour="dashboard-charts">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ActivityChart data={chartData} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
        >
          <SystemUsageChart data={systemUsageData} />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        {/* Favorite Systems */}
        <motion.div
          className="h-full min-h-0"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Item 4
              </CardTitle>
              <CardDescription>
                Acesso rápido ao Item 1 que você mais usa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {favoriteDashboardSlots.real.map((system) => (
                  <div
                    key={system.id}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 hover:bg-accent/60 transition-colors group"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="shrink-0 rounded-lg bg-primary/10 p-1.5">
                        {renderIcon(system.icon, 'w-8 h-8 text-primary object-contain')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{system.name}</p>
                        <Badge variant="outline" className="mt-0.5 w-fit text-xs">
                          {system.category}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      onClick={() => handleSystemAccess(system.id, system.url)}
                      className="h-9 w-9 shrink-0 p-0"
                      aria-label={`Abrir ${system.name}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {Array.from({ length: favoriteDashboardSlots.placeholderCount }).map((_, i) => (
                  <Link
                    key={`favorite-placeholder-${i}`}
                    to="/favorites"
                    className="block w-full min-h-[52px] rounded-lg border border-dashed border-muted-foreground/25 bg-muted/5 px-3 py-2 outline-none transition-colors hover:border-muted-foreground/40 hover:bg-muted/15 focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Gerenciar favoritos"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          className="h-full min-h-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Atividade Recente
              </CardTitle>
              <CardDescription>Seus últimos acessos aos aplicativos</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              {recentLogs.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-8">
                  <p className="text-center text-sm text-muted-foreground">
                    Nenhuma atividade recente
                  </p>
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-0">
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
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* All Systems Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        data-tour="dashboard-all-apps"
      >
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Todo o Item 1</CardTitle>
                <CardDescription>
                  Clique em um aplicativo para acessá-lo
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate('/systems')}>
                Ver Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systems.slice(0, 6).map((system) => {
                const isFavorite = favoriteSystems.some((s) => s.id === system.id);

                return (
                  <motion.div
                    key={system.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative p-4 rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => handleSystemAccess(system.id, system.url)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        {renderIcon(system.icon, 'w-10 h-10 text-primary object-contain')}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(system.id);
                        }}
                        disabled={favoriteTogglingId === system.id}
                        className="p-1 hover:bg-background rounded transition-colors disabled:opacity-50"
                        aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            isFavorite
                              ? 'fill-yellow-500 text-yellow-500'
                              : 'text-muted-foreground'
                          } ${favoriteTogglingId === system.id ? 'animate-pulse' : ''}`}
                        />
                      </button>
                    </div>
                    <h3 className="font-semibold mb-1">{system.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {system.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {system.category}
                      </Badge>
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
        </>
      )}
      <ComingSoonModal
        open={!!comingSoonSystem}
        onClose={() => setComingSoonSystem(null)}
        systemName={comingSoonSystem?.name}
        systemUrl={comingSoonSystem?.url}
        status={comingSoonSystem?.status}
      />
      <FavoriteLimitDialog open={favoriteLimitOpen} onOpenChange={setFavoriteLimitOpen} />
    </div>
    </MainViewFluidShell>
  );
}

