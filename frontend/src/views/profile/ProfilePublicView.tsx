import { useState, useEffect, useMemo } from 'react';
import { databaseService } from '@/services/supabase';
import { MagicBento } from './MagicBento';

interface ProfilePublicViewProps {
  userId: string | null;
}

interface Stats {
  totalApps: number;
  favoriteCount: number;
}

export function ProfilePublicView({ userId }: ProfilePublicViewProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalApps: 0,
    favoriteCount: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!userId) {
        setStats({ totalApps: 0, favoriteCount: 0 });
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [accessRes, systemsRes] = await Promise.all([
          databaseService.getUserSystemAccess(userId),
          databaseService.getSystemsForMember(userId),
        ]);
        /** Linha de user_app_access como retornada pela API (campos camel/snake mistos). */
        type UserAppAccessRow = {
          access?: boolean;
          can_access?: boolean;
          is_favorite?: boolean;
          favorite?: boolean;
        };
        const accessList = (accessRes.data ?? []) as UserAppAccessRow[];
        const systems = systemsRes.data ?? [];
        const hasAccess = (row: UserAppAccessRow) =>
          row.access !== false && row.can_access !== false;
        const favoriteCount = accessList.filter(
          (row) => !!(row.is_favorite ?? row.favorite) && hasAccess(row)
        ).length;
        setStats({
          totalApps: systems.length,
          favoriteCount,
        });
      } catch {
        setStats({ totalApps: 0, favoriteCount: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userId]);

  const cardData = useMemo(
    () => [
      {
        title: 'Sistemas com acesso',
        description: `${stats.totalApps} sistema${stats.totalApps !== 1 ? 's' : ''} disponíve${stats.totalApps === 1 ? 'l' : 'is'}`,
        label: 'Acesso',
      },
      {
        title: 'Item 4',
        description: `${stats.favoriteCount} item${stats.favoriteCount !== 1 ? 's' : ''} na Item 4`,
        label: 'Preferidos',
      },
      {
        title: 'Resumo',
        description: 'Suas métricas de uso no GêLeads',
        label: 'Visão geral',
      },
    ],
    [stats.totalApps, stats.favoriteCount]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-muted-foreground">Carregando estatísticas...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <MagicBento
        cardData={cardData}
        enableTilt
        enableSpotlight
        enableBorderGlow
        glowColor="26, 147, 134"
        spotlightRadius={300}
      />
    </div>
  );
}
