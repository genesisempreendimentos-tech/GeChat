import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search } from 'lucide-react';
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

export default function AdminMembersPage() {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await databaseService.getUsers();
      if (error) console.error(error);
      setMembers((data ?? []) as User[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      (m.name ?? '').toLowerCase().includes(q) ||
      (m.email ?? '').toLowerCase().includes(q) ||
      (m.role ?? '').toLowerCase().includes(q) ||
      (m.accessType ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Users}
        title="Membros"
        description="Usuários que criaram conta no GeApps. Exibindo dados cadastrais disponíveis."
      />

      <AdminControlLine
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        leftContent={
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail, role..."
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
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum membro encontrado.</p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {member.avatar ? (
                          <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-semibold text-primary">
                            {(member.name ?? '?').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base truncate">{member.name || '—'}</CardTitle>
                        <CardDescription className="text-xs truncate">{member.email || '—'}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm space-y-1">
                    <p><span className="text-muted-foreground">Role:</span> {member.role ?? '—'}</p>
                    {member.accessType != null && member.accessType !== '' && (
                      <p><span className="text-muted-foreground">Acesso:</span> {member.accessType}</p>
                    )}
                    <p className="text-muted-foreground text-xs">
                      {member.createdAt
                        ? format(new Date(member.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
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
                  <th className="text-left py-3 px-2 font-medium">Role</th>
                  <th className="text-left py-3 px-2 font-medium">Acesso</th>
                  <th className="text-left py-3 px-2 font-medium">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr key={member.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-2 font-medium">{member.name || '—'}</td>
                    <td className="py-2 px-2 text-muted-foreground">{member.email || '—'}</td>
                    <td className="py-2 px-2">{member.role ?? '—'}</td>
                    <td className="py-2 px-2">{member.accessType ?? '—'}</td>
                    <td className="py-2 px-2 text-muted-foreground">
                      {member.createdAt
                        ? format(new Date(member.createdAt), 'dd/MM/yyyy', { locale: ptBR })
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
