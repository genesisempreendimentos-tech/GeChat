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
import { getAllCollaboratorsSectors } from '@/services/corporateProfile';
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
  const [sectors, setSectors] = useState<Record<string, string>>({});

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
      const [usersRes, sectorsData] = await Promise.all([
        databaseService.getUsers(),
        getAllCollaboratorsSectors()
      ]);
      if (usersRes.error) console.error(usersRes.error);
      setMembers((usersRes.data ?? []) as User[]);
      setSectors(sectorsData);
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
                  <CardContent className="pt-0 text-sm">
                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">Acesso</span>
                        <span className="font-medium text-xs">
                          {(member.accessType?.toLowerCase().includes('admin') || member.role?.toLowerCase().includes('admin')) ? 'Admin' : 'Membro'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">Setor</span>
                        <span className="font-medium text-xs truncate max-w-[120px]" title={sectors[member.email?.toLowerCase()] || '—'}>
                          {sectors[member.email?.toLowerCase()] || '—'}
                        </span>
                      </div>
                    </div>
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
                  <th className="text-left py-3 px-2 font-medium">Setor</th>
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
                    <td className="py-2 px-2">{(member.accessType?.toLowerCase().includes('admin') || member.role?.toLowerCase().includes('admin')) ? 'Admin' : 'Membro'}</td>
                    <td className="py-2 px-2 text-muted-foreground truncate max-w-[150px]" title={sectors[member.email?.toLowerCase()] || '—'}>
                      {sectors[member.email?.toLowerCase()] || '—'}
                    </td>
                    <td className="py-2 px-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 rounded-lg text-xs gap-1.5 border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/40"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAccessModal(member, e);
                        }}
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
        <DialogContent className="sm:max-w-lg rounded-3xl border border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-border/40 bg-muted/20 shrink-0">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {accessModal?.member.avatar
                      ? <img src={accessModal.member.avatar} alt="" className="w-full h-full object-cover" />
                      : <span className="text-xl font-bold text-primary">{(accessModal?.member.name ?? '?').charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-semibold tracking-tight">{accessModal?.member.name || '—'}</DialogTitle>
                    <DialogDescription className="text-sm mt-1">
                      Gerencie os sistemas que este membro pode acessar
                    </DialogDescription>
                  </div>
                </div>
                {!loadingAccess && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 shadow-sm mt-1">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary whitespace-nowrap">{grantedCount} liberados</span>
                  </div>
                )}
              </div>
            </DialogHeader>

            {/* Barra de busca + filtros */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
              <div className="relative w-full sm:flex-1 group/search">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within/search:text-primary transition-colors duration-200" />
                <Input
                  placeholder="Buscar sistema..."
                  className="pl-9 h-10 rounded-xl bg-background/50 border-border/60 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50 w-full"
                  value={accessSearch}
                  onChange={(e) => setAccessSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-1.5 w-full sm:w-auto p-1 rounded-xl bg-muted/40 border border-border/40">
                {(['all', 'granted', 'denied'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setAccessFilter(f)}
                    className={cn(
                      'flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
                      accessFilter === f
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    )}
                  >
                    {f === 'all' ? 'Todos' : f === 'granted' ? 'Liberados' : 'Bloqueados'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lista de sistemas */}
          <div className="flex-1 overflow-y-auto p-6 space-y-2.5 min-h-0 bg-background/50">
            {loadingAccess ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                <span className="text-sm text-muted-foreground animate-pulse">Carregando sistemas...</span>
              </div>
            ) : filteredAccesses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                  <Search className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">Nenhum sistema encontrado.</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filteredAccesses.map((system) => (
                  <motion.button
                    key={system.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => toggleAccess(system.id)}
                    className={cn(
                      'w-full flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300 text-left group/item relative overflow-hidden',
                      system.canAccess
                        ? 'bg-primary/5 border-primary/20 shadow-sm hover:bg-primary/10 hover:border-primary/30 hover:shadow-md'
                        : 'bg-muted/10 border-border/40 hover:bg-muted/30 hover:border-border/60 hover:shadow-sm'
                    )}
                  >
                    {system.canAccess && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-500" />
                    )}
                    
                    {/* Ícone do sistema */}
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 relative z-10',
                      system.canAccess 
                        ? 'bg-primary/15 text-primary shadow-inner border border-primary/20' 
                        : 'bg-muted/50 text-muted-foreground border border-border/50 group-hover/item:bg-muted/80'
                    )}>
                      {renderSystemIcon(system.icon)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 relative z-10">
                      <p className={cn(
                        'text-sm font-semibold truncate transition-colors duration-300', 
                        system.canAccess ? 'text-foreground' : 'text-muted-foreground group-hover/item:text-foreground/80'
                      )}>
                        {system.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {system.category && (
                          <span className="text-[11px] font-medium text-muted-foreground/70">{system.category}</span>
                        )}
                        {system.status !== 'ativo' && (
                          <span className={cn(
                            'text-[9px] px-1.5 py-0.5 rounded-md border font-bold uppercase tracking-wider',
                            system.status === 'beta' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                            system.status === 'rascunho' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' : 
                            system.status === 'arquivado' ? 'bg-slate-500/10 border-slate-500/20 text-slate-500' : ''
                          )}>
                            {system.status}
                          </span>
                        )}
                        {system.canAccess !== system.original && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-yellow-500/15 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 font-bold uppercase tracking-wider animate-in fade-in zoom-in duration-300">
                            alterado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Toggle */}
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 relative z-10 border-2',
                      system.canAccess
                        ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20 scale-110'
                        : 'bg-transparent border-muted-foreground/30 text-transparent group-hover/item:border-muted-foreground/50 scale-100'
                    )}>
                      <Check className={cn("w-3.5 h-3.5 transition-transform duration-300", system.canAccess ? "scale-100" : "scale-0")} strokeWidth={3} />
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-border/40 bg-muted/20 shrink-0 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {changedCount > 0 ? (
                <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400 font-medium animate-in fade-in slide-in-from-bottom-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  {changedCount} alteraç{changedCount > 1 ? 'ões' : 'ão'} pendente{changedCount > 1 ? 's' : ''}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma alteração pendente</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" className="rounded-xl h-10 px-4" onClick={() => setAccessModal(null)}>
                Cancelar
              </Button>
              <Button
                className={cn(
                  "rounded-xl h-10 px-5 gap-2 transition-all duration-300",
                  changedCount > 0 && !savingAccess ? "shadow-lg shadow-primary/25 hover:shadow-primary/40" : ""
                )}
                onClick={handleSaveAccess}
                disabled={savingAccess || changedCount === 0}
              >
                {savingAccess ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {savingAccess ? 'Salvando...' : 'Salvar alterações'}
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
