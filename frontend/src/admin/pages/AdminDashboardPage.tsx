import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  Radio,
  UserCheck,
  Users,
} from 'lucide-react';
import { AdminPageHeader } from '@/admin/components/AdminPageHeader';
import { AdminStatCard } from '@/admin/components/AdminStatCard';
import { AdminMessagesChart } from '@/admin/components/AdminMessagesChart';
import { AdminHealthPanel } from '@/admin/components/AdminHealthPanel';
import { adminApi } from '@/admin/services/admin-api';
import type { AdminActivityPoint, AdminHealth, AdminOverview } from '@/admin/types';
import { LoadingGifScreen } from '@/components/LoadingGif';

const REFRESH_MS = 30_000;

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [activity, setActivity] = useState<AdminActivityPoint[]>([]);
  const [health, setHealth] = useState<AdminHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [overviewData, activityData, healthData] = await Promise.all([
        adminApi.getOverview(),
        adminApi.getActivity(7),
        adminApi.getHealth(),
      ]);
      setOverview(overviewData);
      setActivity(activityData.series);
      setHealth(healthData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(true);
    const id = window.setInterval(() => {
      void loadData(false);
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [loadData]);

  if (loading && !overview) {
    return <LoadingGifScreen />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={LayoutDashboard}
        title="Visão geral"
        description="Monitoramento do GêChat em tempo quase real."
      />

      {error ? (
        <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          {error}
        </p>
      ) : null}

      {overview ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          <AdminStatCard icon={UserCheck} label="Online agora" value={overview.onlineNow} />
          <AdminStatCard
            icon={Users}
            label="Ativos (24h)"
            value={overview.activeUsers24h}
            hint={`${overview.activeUsers7d} nos últimos 7 dias`}
          />
          <AdminStatCard
            icon={MessagesSquare}
            label="Conversas"
            value={overview.conversationsTotal}
            hint={`${overview.conversationsByType.direct} diretas · ${overview.conversationsByType.group} grupos · ${overview.conversationsByType.channel} canais`}
          />
          <AdminStatCard icon={MessageSquare} label="Mensagens hoje" value={overview.messagesToday} />
          <AdminStatCard icon={MessageSquare} label="Mensagens (7d)" value={overview.messages7d} />
          <AdminStatCard icon={Radio} label="Diretas" value={overview.conversationsByType.direct} />
          <AdminStatCard icon={Users} label="Grupos" value={overview.conversationsByType.group} />
          <AdminStatCard icon={Radio} label="Canais" value={overview.conversationsByType.channel} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        <div className="xl:col-span-2">
          <AdminMessagesChart data={activity} />
        </div>
        <AdminHealthPanel health={health} loading={loading && !health} />
      </div>
    </div>
  );
}
