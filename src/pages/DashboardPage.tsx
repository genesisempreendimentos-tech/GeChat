import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useAccessLogStore } from '@/store/accessLogStore';
import { databaseService } from '@/services/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ActivityChart, SystemUsageChart } from '@/components/Charts';
import { EmptyFavoritesState } from '@/components/EmptyStates';
import { LoadingGifScreen } from '@/components/LoadingGif';
import { Badge } from '@/components/ui/badge';
import { BrandDatabricksIcon } from '@/components/icons/BrandDatabricksIcon';
import {
  Star,
  Activity,
  TrendingUp,
  ExternalLink,
  Clock,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, subDays, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { System } from '@/types';

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

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { getRecentLogs, getAllLogs, addLog } = useAccessLogStore();

  const [systems, setSystems] = useState<System[]>([]);
  const [userAccesses, setUserAccesses] = useState<any[]>([]);
  const [totalAccessCount, setTotalAccessCount] = useState<number>(0);
  const [allAccessLogs, setAllAccessLogs] = useState<any[]>([]);
  const [recentLogsFromApi, setRecentLogsFromApi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteTogglingId, setFavoriteTogglingId] = useState<string | null>(null);

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
      const isAdminOrManager = user.role === 'admin' || user.role === 'manager';
      if (isAdminOrManager) {
        const { data: systemsData, error: systemsError } = await databaseService.getSystems();
        if (systemsError) console.error('Erro ao carregar sistemas:', systemsError);
        setSystems(systemsData || []);
      } else {
        const { data: systemsData, error: systemsError } = await databaseService.getSystemsForMember(user.id);
        if (systemsError) console.error('Erro ao carregar sistemas:', systemsError);
        setSystems(systemsData || []);
      }

      const { data: accessData, error: accessError } = await databaseService.getUserSystemAccess(user.id);
      if (accessError) console.error('Erro ao carregar acessos:', accessError);
      setUserAccesses(accessData || []);

      const [total, { data: logsAll }, { data: recentLogs }] = await Promise.all([
        databaseService.getTotalAccessCount(),
        databaseService.getAccessLogsAll(500),
        databaseService.getAccessLogs(user.id, 5),
      ]);
      setTotalAccessCount(total);
      setAllAccessLogs(logsAll || []);
      setRecentLogsFromApi(recentLogs || []);
    } catch (error) {
      console.error('Erro geral ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const favoriteSystems = useMemo(() => {
    const favoriteIds = userAccesses
      .filter((access: any) => !!(access.is_favorite ?? access.favorite))
      .map((access: any) => access.system_id);
    return systems.filter((system) => favoriteIds.includes(system.id));
  }, [systems, userAccesses]);

  const toggleFavorite = async (systemId: string) => {
    if (!user?.id) return;
    setFavoriteTogglingId(systemId);
    const { error } = await databaseService.toggleFavorite(user.id, systemId);
    await loadData();
    setFavoriteTogglingId(null);
    if (error) console.error('Erro ao favoritar:', error);
  };
  const recentLogs = useMemo(() => {
    return recentLogsFromApi.map((log: any) => ({
      id: log.id ?? log.app_id + log.user_id,
      systemName: log.systemName ?? log.systems?.name ?? 'Sistema',
      timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
    }));
  }, [recentLogsFromApi]);

  // Gráficos com base em acessos totais (todos os usuários, todos os apps)
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
      const ts = log.timestamp ?? log.created_at;
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

  const stats = [
    {
      title: 'Sistemas Disponíveis',
      value: systems.length,
      icon: BrandDatabricksIcon,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      trend: null as number | null,
    },
    {
      title: 'Favoritos',
      value: favoriteSystems.length,
      icon: Star,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      trend: null as number | null,
    },
    {
      title: 'Acessos Totais',
      value: totalAccessCount,
      icon: Activity,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      trend: null as number | null,
    },
    {
      title: 'Sistemas Ativos',
      value: systems.filter((s) => s.active).length,
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      trend: null as number | null,
    },
  ];

  const handleSystemAccess = (systemId: string, url: string) => {
    if (user?.id) {
      databaseService.logAccess(user.id, systemId);
      addLog(user.id, systemId);
    }
    window.open(url, '_blank');
    loadData();
  };

  const renderIcon = (iconPath: string, className: string = '') => {
    // Se for URL ou caminho (SVG, PNG, etc.) da tabela apps, renderizar <img>
    const isImg = iconPath?.startsWith('http') || iconPath?.startsWith('/') || iconPath?.endsWith('.svg') || iconPath?.endsWith('.png') || iconPath?.endsWith('.jpg') || iconPath?.endsWith('.jpeg');
    if (isImg) {
      return <img src={iconPath} alt="System icon" className={className} />;
    }
    // Caso contrário, usar ícone Lucide
    const Icon = (Icons as any)[iconPath];
    const IconComponent = Icon || BrandDatabricksIcon;
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
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          Bem-vindo, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-muted-foreground mt-2">
          Aqui está um resumo dos seus sistemas e atividades recentes.
        </p>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Favorite Systems */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Sistemas Favoritos
              </CardTitle>
              <CardDescription>
                Acesso rápido aos seus sistemas mais usados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {favoriteSystems.length === 0 ? (
                <EmptyFavoritesState onBrowseSystems={() => navigate('/systems')} />
              ) : (
                favoriteSystems.slice(0, 5).map((system) => {
                  return (
                    <div
                      key={system.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {renderIcon(system.icon, 'w-10 h-10 text-primary object-contain')}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{system.name}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {system.category}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSystemAccess(system.id, system.url)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Atividade Recente
              </CardTitle>
              <CardDescription>Seus últimos acessos aos sistemas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma atividade recente
                </p>
              ) : (
                recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between pb-3 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm">{log.systemName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(log.timestamp, {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))
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
      >
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Todos os Sistemas</CardTitle>
                <CardDescription>
                  Clique em um sistema para acessá-lo
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
    </div>
  );
}
