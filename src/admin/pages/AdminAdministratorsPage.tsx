import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminPageHeader } from '@/admin/components/AdminPageHeader';
import { AdminControlLine, type ViewMode } from '@/admin/components/AdminControlLine';
import { AdminBigBox } from '@/admin/components/AdminBigBox';
import { databaseService } from '@/services/supabase';
import { LoadingGifScreen } from '@/components/LoadingGif';
import { User } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminAdministratorsPage() {
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await databaseService.getAppsAdmins();
      if (error) console.error(error);
      setAdmins((data ?? []) as User[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = admins.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      (m.name ?? '').toLowerCase().includes(q) ||
      (m.email ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Shield}
        title="Administradores"
        description="Usuários com acesso ao painel administrativo de todos os Apps (Ctrl+Shift+A)."
      />

      <AdminControlLine
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        leftContent={
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              className="pl-8 w-56"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        }
        showViewToggle
      />

      <AdminBigBox>
        {loading ? (
          <LoadingGifScreen className="h-64" />
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum administrador encontrado.</p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((admin, index) => (
              <motion.div
                key={admin.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {admin.avatar ? (
                          <img src={admin.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-semibold text-primary">
                            {(admin.name ?? '?').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base truncate">{admin.name || '—'}</CardTitle>
                        <CardDescription className="text-xs truncate">{admin.email || '—'}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm">
                    <p className="text-muted-foreground text-xs">
                      {admin.createdAt
                        ? format(new Date(admin.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : '—'}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium">Nome</th>
                  <th className="text-left py-3 px-2 font-medium">E-mail</th>
                  <th className="text-left py-3 px-2 font-medium">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((admin) => (
                  <tr key={admin.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-2 font-medium">{admin.name || '—'}</td>
                    <td className="py-2 px-2 text-muted-foreground">{admin.email || '—'}</td>
                    <td className="py-2 px-2 text-muted-foreground">
                      {admin.createdAt
                        ? format(new Date(admin.createdAt), 'dd/MM/yyyy', { locale: ptBR })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminBigBox>
    </div>
  );
}
