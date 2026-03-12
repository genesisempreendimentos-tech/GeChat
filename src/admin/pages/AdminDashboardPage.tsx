import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Users, Shield, AppWindow } from 'lucide-react';
import { AdminPageHeader } from '@/admin/components/AdminPageHeader';
import { AdminBigBox } from '@/admin/components/AdminBigBox';
import { databaseService } from '@/services/supabase';
import { LoadingGifScreen } from '@/components/LoadingGif';

interface Counts {
  users: number;
  softadmins: number;
  apps: number;
}

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const c = await databaseService.getAdminCounts();
      setCounts(c);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="Visão geral do painel administrativo."
      />

      <AdminBigBox>
        {loading ? (
          <LoadingGifScreen className="h-48" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Usuários
                  </CardTitle>
                  <Users className="w-5 h-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{counts?.users ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Membros cadastrados</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Administradores
                  </CardTitle>
                  <Shield className="w-5 h-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{counts?.softadmins ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Softadmins</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Apps
                  </CardTitle>
                  <AppWindow className="w-5 h-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{counts?.apps ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Sistemas cadastrados</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AdminBigBox>
    </div>
  );
}
