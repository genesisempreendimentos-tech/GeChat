import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, Search, UserPlus, ArrowDownToLine } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AdminPageHeader } from '@/admin/components/AdminPageHeader';
import { AdminControlLine, type ViewMode } from '@/admin/components/AdminControlLine';
import { AdminBigBox } from '@/admin/components/AdminBigBox';
import { databaseService } from '@/services/supabase';
import { LoadingGifScreen } from '@/components/LoadingGif';
import { User } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreVertical } from 'lucide-react';

export default function AdminAdministratorsPage() {
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [members, setMembers] = useState<User[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [downgradeLoadingId, setDowngradeLoadingId] = useState<string | null>(null);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    const { data, error } = await databaseService.getAppsAdmins();
    if (error) console.error(error);
    setAdmins((data ?? []) as User[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  useEffect(() => {
    if (addModalOpen) {
      const load = async () => {
        const { data } = await databaseService.getUsers();
        const all = (data ?? []) as User[];
        const adminIds = new Set(admins.map((a) => a.id));
        const onlyMembers = all.filter((u) => !adminIds.has(u.id));
        setMembers(onlyMembers);
        setSelectedMemberId(null);
        setMemberSearch('');
      };
      load();
    }
  }, [addModalOpen]); // admins usado no closure ao abrir

  const membersFiltered = members.filter((m) => {
    const q = memberSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (m.name ?? '').toLowerCase().includes(q) ||
      (m.email ?? '').toLowerCase().includes(q)
    );
  });

  const handleAddAdmin = async () => {
    if (!selectedMemberId) return;
    setAddLoading(true);
    const { error } = await databaseService.updateUser(selectedMemberId, { access_type: 'appsadmin' });
    setAddLoading(false);
    if (error) {
      console.error(error);
      return;
    }
    setAddModalOpen(false);
    loadAdmins();
  };

  const handleRebaixar = async (userId: string) => {
    setDowngradeLoadingId(userId);
    const { error } = await databaseService.updateUser(userId, { access_type: 'member' });
    setDowngradeLoadingId(null);
    if (error) console.error(error);
    else loadAdmins();
  };

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
        action={
          <Button onClick={() => setAddModalOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Adicionar admin
          </Button>
        }
      />

      {/* Modal Adicionar admin */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-lg" id="add_app_admin">
          <DialogHeader>
            <DialogTitle>Adicionar admin</DialogTitle>
            <DialogDescription>
              Selecione um membro do GêApps para promover a appsadmin. Apenas membros existentes aparecem na lista.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Buscar membro (nome ou e-mail)</label>
              <Input
                placeholder="Digite para filtrar..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {membersFiltered.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">
                  {members.length === 0 ? 'Todos os usuários já são admins.' : 'Nenhum membro encontrado com esse filtro.'}
                </p>
              ) : (
                <ul className="p-1">
                  {membersFiltered.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedMemberId(m.id === selectedMemberId ? null : m.id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 ${
                          selectedMemberId === m.id ? 'bg-primary/15 text-primary font-medium' : 'hover:bg-muted/70'
                        }`}
                      >
                        <span className="truncate">{m.name || '—'}</span>
                        <span className="text-muted-foreground truncate text-xs">{m.email || ''}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {selectedMemberId && (
              <p className="text-xs text-muted-foreground">
                Selecionado: {members.find((m) => m.id === selectedMemberId)?.name ?? members.find((m) => m.id === selectedMemberId)?.email ?? selectedMemberId}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddAdmin} disabled={!selectedMemberId || addLoading}>
              {addLoading ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleRebaixar(admin.id)}
                            disabled={downgradeLoadingId === admin.id}
                          >
                            <ArrowDownToLine className="w-4 h-4 mr-2" />
                            {downgradeLoadingId === admin.id ? 'Rebaixando...' : 'Rebaixar a member'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                  <th className="w-10 py-3 px-2"></th>
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
                    <td className="py-2 px-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleRebaixar(admin.id)}
                            disabled={downgradeLoadingId === admin.id}
                          >
                            <ArrowDownToLine className="w-4 h-4 mr-2" />
                            {downgradeLoadingId === admin.id ? 'Rebaixando...' : 'Rebaixar a member'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
