import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, ShieldCheck, Check, X, Loader2, Boxes, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AdminPageHeader } from '@/admin/components/AdminPageHeader';
import { AdminControlLine, type ViewMode } from '@/admin/components/AdminControlLine';
import { AdminBigBox } from '@/admin/components/AdminBigBox';
import { databaseService } from '@/services/supabase';
import { LoadingGif, LoadingGifScreen } from '@/components/LoadingGif';
import { User } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuthStore } from '@/store/authStore';
import ProfileCardInfoPopup from '@/components/profile/ProfileCard/ProfileCardInfoPopup';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemAccess {
  id: string;
  name: string;
  icon: string;
  category: string;
  status: string;
  canAccess: boolean;
  original: boolean; // estado original para detectar mudanças
}

export default function AdminMembersPage() {
  const { user: currentUser } = useAuthStore();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedMemberData, setSelectedMemberData] = useState<any>(null);
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState<string | null>(null);

  // Modal de liberação em massa
  const [accessModal, setAccessModal] = useState<{ member: User } | null>(null);
  const [allSystems, setAllSystems] = useState<any[]>([]);
  const [systemAccesses, setSystemAccesses] = useState<SystemAccess[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);
  const [accessSearch, setAccessSearch] = useState('');
  const [accessFilter, setAccessFilter] = useState<'all' | 'granted' | 'denied'>('all');

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

  const handleOpenProfile = async (memberId: string) => {
    setLoadingProfile(memberId);
    const { data } = await databaseService.getUserById(memberId);
    setLoadingProfile(null);
    if (data) {
      setSelectedMemberData(data);
      setProfilePopupOpen(true);
    }
  };

  const handleOpenAccessModal = useCallback(async (member: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setAccessModal({ member });
    setAccessSearch('');
    setAccessFilter('all');
    setLoadingAccess(true);

    const [{ data: systems }, { data: accesses }] = await Promise.all([
      databaseService.getSystems(),
      databaseService.getUserSystemAccess(member.id),
    ]);

    const systemList = (systems ?? []) as any[];
    const accessMap = new Map<string, boolean>();
    (accesses ?? []).forEach((a: any) => {
      accessMap.set(a.system_id ?? a.app_id, !!(a.can_access ?? a.access));
    });

    const mapped: SystemAccess[] = systemList.map((s: any) => ({
      id: s.id,
      name: s.name,
      icon: s.icon ?? s.icon_url ?? '',
      category: s.category ?? '',
      status: s.status ?? 'ativo',
      canAccess: accessMap.get(s.id) ?? false,
      original: accessMap.get(s.id) ?? false,
    }));

    // Ordenar: com acesso primeiro, depois por nome
    mapped.sort((a, b) => {
      if (a.canAccess !== b.canAccess) return a.canAccess ? -1 : 1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

    setSystemAccesses(mapped);
    setLoadingAccess(false);
  }, []);

  const toggleAccess = (systemId: string) => {
    setSystemAccesses(prev =>
      prev.map(s => s.id === systemId ? { ...s, canAccess: !s.canAccess } : s)
    );
  };

  const handleSaveAccess = async () => {
    if (!accessModal) return;
    setSavingAccess(true);

    const changed = systemAccesses.filter(s => s.canAccess !== s.original);
    await Promise.all(
      changed.map(s =>
        databaseService.setUserSystemAccess(accessModal.member.id, s.id, s.canAccess)
      )
    );

    // Atualiza originais
    setSystemAccesses(prev => prev.map(s => ({ ...s, original: s.canAccess })));
    setSavingAccess(false);
  };

  const renderSystemIcon = (iconPath: string) => {
    const isImg = iconPath?.startsWith('http') || iconPath?.startsWith('/') || iconPath?.endsWith('.svg') || iconPath?.endsWith('.png');
    if (isImg) return <img src={iconPath} alt="" className="w-5 h-5 object-contain" />;
    const Icon = (Icons as any)[iconPath];
    const IconComp = Icon || Boxes;
    return <IconComp className="w-5 h-5" />;
  };

  const filteredAccesses = systemAccesses.filter(s => {
    const q = accessSearch.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    const matchFilter =
      accessFilter === 'all' ? true :
      accessFilter === 'granted' ? s.canAccess :
      !s.canAccess;
    return matchSearch && matchFilter;
  });

  const changedCount = systemAccesses.filter(s => s.canAccess !== s.original).length;
  const grantedCount = systemAccesses.filter(s => s.canAccess).length;

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
          <div className="relative group/search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors duration-200" />
            <Input
              placeholder="Buscar por nome, e-mail, role..."
              className="pl-8 w-60 h-9 rounded-xl border-border/60 bg-muted/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50 text-sm"
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
                <Card
                  className="h-full cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 group"
                  onClick={() => handleOpenProfile(member.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                        {loadingProfile === member.id ? (
                          <LoadingGif size="sm" />
                        ) : member.avatar ? (
                          <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-semibold text-primary">
                            {(member.name ?? '?').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base truncate group-hover:text-primary transition-colors">{member.name || '—'}</CardTitle>
                        <CardDescription className="text-xs truncate">{member.email || '—'}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm space-y-1">
                    {member.accessType != null && member.accessType !== '' && (
                      <p><span className="text-muted-foreground">Acesso:</span> {member.accessType}</p>
                    )}
                    <p className="text-muted-foreground text-xs">
                      {member.createdAt
                        ? format(new Date(member.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : '—'}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 h-8 rounded-lg text-xs gap-1.5 border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/40"
                      onClick={(e) => handleOpenAccessModal(member, e)}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Gerenciar Acessos
                    </Button>
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
                  <th className="text-left py-3 px-2 font-medium">Acesso</th>
                  <th className="text-left py-3 px-2 font-medium">Cadastro</th>
                  <th className="text-left py-3 px-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => handleOpenProfile(member.id)}
                  >
                    <td className="py-2 px-2 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                          {loadingProfile === member.id ? (
                            <LoadingGif size="sm" />
                          ) : member.avatar ? (
                            <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-semibold text-primary">
                              {(member.name ?? '?').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        {member.name || '—'}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">{member.email || '—'}</td>
                    <td className="py-2 px-2">{member.accessType ?? '—'}</td>
                    <td className="py-2 px-2 text-muted-foreground">
                      {member.createdAt
                        ? format(new Date(member.createdAt), 'dd/MM/yyyy', { locale: ptBR })
                        : '—'}
                    </td>
                    <td className="py-2 px-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 rounded-lg text-xs gap-1.5 border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/40"
                        onClick={(e) => handleOpenAccessModal(member, e)}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        Acessos
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminBigBox>

      {/* Modal: Gerenciar Acessos em Massa */}
      <Dialog open={!!accessModal} onOpenChange={(o) => { if (!o) setAccessModal(null); }}>
        <DialogContent className="sm:max-w-lg rounded-2xl border border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 bg-muted/20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                {accessModal?.member.avatar
                  ? <img src={accessModal.member.avatar} alt="" className="w-full h-full object-cover" />
                  : <span className="text-base font-semibold text-primary">{(accessModal?.member.name ?? '?').charAt(0).toUpperCase()}</span>
                }
              </div>
              <div>
                <DialogTitle className="text-base font-semibold leading-tight">{accessModal?.member.name || '—'}</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Gerencie os sistemas que este membro pode acessar
                </DialogDescription>
              </div>
              {!loadingAccess && (
                <div className="ml-auto shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                  <Check className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-primary">{grantedCount} liberados</span>
                </div>
              )}
            </div>

            {/* Barra de busca + filtros */}
            <div className="flex items-center gap-2 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar sistema..."
                  className="pl-8 h-8 rounded-lg text-sm border-border/60 bg-muted/50 transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50"
                  value={accessSearch}
                  onChange={(e) => setAccessSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-1">
                {(['all', 'granted', 'denied'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setAccessFilter(f)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                      accessFilter === f
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {f === 'all' ? 'Todos' : f === 'granted' ? 'Liberados' : 'Bloqueados'}
                  </button>
                ))}
              </div>
            </div>
          </DialogHeader>

          {/* Lista de sistemas */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-0">
            {loadingAccess ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAccesses.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                Nenhum sistema encontrado.
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filteredAccesses.map((system) => (
                  <motion.button
                    key={system.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    onClick={() => toggleAccess(system.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 text-left group',
                      system.canAccess
                        ? 'bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/40'
                        : 'bg-muted/20 border-border/40 hover:bg-muted/40 hover:border-border/70'
                    )}
                  >
                    {/* Ícone do sistema */}
                    <div className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                      system.canAccess ? 'bg-primary/10 text-primary' : 'bg-muted/60 text-muted-foreground'
                    )}>
                      {renderSystemIcon(system.icon)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium truncate transition-colors', system.canAccess ? 'text-foreground' : 'text-muted-foreground')}>
                        {system.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {system.category && (
                          <span className="text-[10px] text-muted-foreground/70">{system.category}</span>
                        )}
                        {system.status !== 'ativo' && (
                          <span className={cn(
                            'text-[10px] px-1.5 py-0 rounded-full border font-medium',
                            system.status === 'beta' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                            system.status === 'rascunho' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' : ''
                          )}>
                            {system.status}
                          </span>
                        )}
                        {system.canAccess !== system.original && (
                          <span className="text-[10px] px-1.5 py-0 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 font-medium">
                            alterado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Toggle */}
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200',
                      system.canAccess
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/50 text-muted-foreground border border-border/50'
                    )}>
                      {system.canAccess ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border/40 bg-muted/10 shrink-0 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {changedCount > 0
                ? <span className="text-yellow-600 dark:text-yellow-400 font-medium">{changedCount} alteração{changedCount > 1 ? 'ões' : ''} pendente{changedCount > 1 ? 's' : ''}</span>
                : 'Nenhuma alteração pendente'
              }
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setAccessModal(null)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="rounded-xl gap-1.5 min-w-[100px]"
                onClick={handleSaveAccess}
                disabled={savingAccess || changedCount === 0}
              >
                {savingAccess ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                {savingAccess ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ProfileCardInfoPopup
        open={profilePopupOpen}
        onOpenChange={setProfilePopupOpen}
        userData={selectedMemberData}
        currentUser={currentUser}
      />
    </div>
  );
}
