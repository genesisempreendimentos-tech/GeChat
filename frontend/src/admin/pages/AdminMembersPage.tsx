import { useState, useEffect, useCallback, type MouseEvent, type ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User as UserIconLucide,
  UserKey,
  Search,
  ShieldCheck,
  Check,
  Boxes,
  UserPen,
  UserStar,
  ShieldUser,
  Zap,
  Power,
  Archive,
  Trash,
  MoreVertical,
  Settings,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MainViewHeader } from '@/components/layout/header';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { AdminControlLine, type ViewMode } from '@/admin/components/AdminControlLine';
import { AdminBigBox } from '@/admin/components/AdminBigBox';
import { databaseService } from '@/services/supabase';
import { GEADS_APP_ID } from '@/services/supabase';
import { LoadingGif, LoadingGifScreen } from '@/components/LoadingGif';
import { User } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuthStore } from '@/store/authStore';
import { getAllCollaboratorsNeonMeta, type CollaboratorNeonMeta } from '@/services/corporateProfile';
import ProfileCardInfoPopup from '@/components/profile/ProfileCard/ProfileCardInfoPopup';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

/** Filtro por tipo de acesso — segment control na mesma linha do AdminControlLine. */
const MEMBER_TYPE_FILTER_SEGMENTS: {
  value: 'all' | 'user' | 'creator' | 'admin';
  label: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { value: 'all', label: 'Todos', Icon: UserIconLucide },
  { value: 'user', label: 'Users', Icon: UserKey },
  { value: 'creator', label: 'Creators', Icon: UserPen },
  { value: 'admin', label: 'Admins', Icon: UserStar },
];

interface SystemAccess {
  id: string;
  name: string;
  icon: string;
  category: string;
  status: string;
  canAccess: boolean;
  original: boolean; // estado original para detectar mudanças
}

function normalizeGeAdsName(value: string): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');
}

function isGeAdsSystem(system: SystemAccess): boolean {
  if (!system) return false;
  if (system.id === GEADS_APP_ID) return true;
  const normalized = normalizeGeAdsName(system.name);
  return normalized === 'geleads' || normalized === 'geads';
}

function emailNeonKey(email: string | undefined): string {
  return (email ?? '').toLowerCase().trim();
}

function memberAccessLabel(member: User): 'Admin' | 'Creator' | 'User' {
  if (member.accessType === 'admin') return 'Admin';
  if (member.accessType === 'creator') return 'Creator';
  return 'User';
}

/** Conta criada (mock). */
function formatProfileCreatedAt(createdAt: Date | undefined): string {
  if (!createdAt || !(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) return '—';
  return format(createdAt, 'dd/MM/yyyy', { locale: ptBR });
}

export default function AdminMembersPage() {
  const { user: currentUser } = useAuthStore();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [neonMeta, setNeonMeta] = useState<Record<string, CollaboratorNeonMeta>>({});

  const [selectedMemberData, setSelectedMemberData] = useState<any>(null);
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState<string | null>(null);

  // Modal de liberação em massa
  const [accessModal, setAccessModal] = useState<{ member: User } | null>(null);
  const [systemAccesses, setSystemAccesses] = useState<SystemAccess[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);
  const [GeAdsRevokeConfirmOpen, setGeAdsRevokeConfirmOpen] = useState(false);
  const [accessSearch, setAccessSearch] = useState('');
  const [accessFilter, setAccessFilter] = useState<'all' | 'granted' | 'denied'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'user' | 'creator' | 'admin'>('all');

  const [manageUsersOpen, setManageUsersOpen] = useState(false);
  const [promoteTab, setPromoteTab] = useState<'creators' | 'admin'>('creators');
  const [promotionSelection, setPromotionSelection] = useState<Record<string, boolean>>({});
  const [promotionSaving, setPromotionSaving] = useState(false);
  const [memberActionsLoadingId, setMemberActionsLoadingId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    const [usersRes, neonData] = await Promise.all([
      databaseService.getUsers(),
      getAllCollaboratorsNeonMeta(),
    ]);
    if (usersRes.error) console.error(usersRes.error);
    setMembers((usersRes.data ?? []) as User[]);
    setNeonMeta(neonData);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleOpenProfile = async (memberId: string) => {
    setLoadingProfile(memberId);
    const { data } = await databaseService.getProfileForPopupByUserId(memberId);
    setLoadingProfile(null);
    if (data) {
      setSelectedMemberData(data);
      setProfilePopupOpen(true);
    }
  };

  const openAccessModalForMember = useCallback(async (member: User) => {
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

    mapped.sort((a, b) => {
      if (a.canAccess !== b.canAccess) return a.canAccess ? -1 : 1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

    setSystemAccesses(mapped);
    setLoadingAccess(false);
  }, []);

  const handleSetMemberAccessType = useCallback(
    async (member: User, accessType: 'user' | 'creator' | 'admin') => {
      setMemberActionsLoadingId(member.id);
      const { error } = await databaseService.updateUser(member.id, { accessType });
      setMemberActionsLoadingId(null);
      if (error) {
        toast.error('Não foi possível atualizar o tipo de acesso.');
        return;
      }
      toast.success(
        accessType === 'admin'
          ? 'Utilizador promovido a administrador.'
          : accessType === 'creator'
            ? 'Utilizador promovido a creator.'
            : 'Utilizador rebaixado para user.'
      );
      await loadMembers();
    },
    [loadMembers]
  );

  const handleSetMemberLifecycleStatus = useCallback(
    async (member: User, profileStatus: 'active' | 'archived' | 'deleted') => {
      setMemberActionsLoadingId(member.id);
      const { error } = await databaseService.updateUser(member.id, { profileStatus });
      setMemberActionsLoadingId(null);
      if (error) {
        toast.error(
          'Não foi possível atualizar o status (mock).'
        );
        return;
      }
      const msg =
        profileStatus === 'archived'
          ? 'Conta arquivada.'
          : profileStatus === 'deleted'
            ? 'Conta marcada como excluída.'
            : 'Conta ativa.';
      toast.success(msg);
      await loadMembers();
    },
    [loadMembers]
  );

  const toggleAccess = (systemId: string) => {
    setSystemAccesses(prev =>
      prev.map(s => s.id === systemId ? { ...s, canAccess: !s.canAccess } : s)
    );
  };

  const hasGeAdsAccessRevokeInChanges = useCallback(() => {
    const GeAdsAccess = systemAccesses.find((s) => isGeAdsSystem(s));
    return !!GeAdsAccess && GeAdsAccess.original === true && GeAdsAccess.canAccess === false;
  }, [systemAccesses]);

  const persistAccessChanges = useCallback(async () => {
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
  }, [accessModal, systemAccesses]);

  const handleSaveAccess = async () => {
    if (hasGeAdsAccessRevokeInChanges()) {
      setGeAdsRevokeConfirmOpen(true);
      return;
    }
    await persistAccessChanges();
  };

  const handleConfirmGeAdsRevoke = async () => {
    setGeAdsRevokeConfirmOpen(false);
    await persistAccessChanges();
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

  /** Menu ⋯ (card e tabela): Aplicativos, Acessos, Status (submenus). */
  const renderMemberOverflowMenu = (member: User) => {
    const isSelf = member.id === currentUser?.id;
    const loading = memberActionsLoadingId === member.id;
    const at = (member.accessType ?? 'user').toLowerCase();
    const lifecycle = member.profileStatus ?? 'active';

    const isAccessCurrent = (role: 'admin' | 'creator' | 'user') => at === role;
    /** Próprio utilizador: não pode mudar papel/status; outros: não repetir o valor atual. */
    const accessOptionDisabled = (role: 'admin' | 'creator' | 'user') =>
      isSelf || isAccessCurrent(role);

    const accessRowClass = (role: 'admin' | 'creator' | 'user') =>
      cn(
        accessOptionDisabled(role) &&
          isAccessCurrent(role) &&
          'bg-primary/10 text-primary/80 data-[disabled]:pointer-events-none data-[disabled]:opacity-100',
        isSelf && !isAccessCurrent(role) && 'text-muted-foreground/60 data-[disabled]:opacity-60'
      );

    const isLifecycleCurrent = (s: 'active' | 'archived' | 'deleted') => lifecycle === s;
    const statusOptionDisabled = (s: 'active' | 'archived' | 'deleted') =>
      isSelf || isLifecycleCurrent(s);

    const statusRowClass = (s: 'active' | 'archived' | 'deleted') =>
      cn(
        statusOptionDisabled(s) &&
          isLifecycleCurrent(s) &&
          'bg-primary/10 text-primary/80 data-[disabled]:pointer-events-none data-[disabled]:opacity-100',
        isSelf && !isLifecycleCurrent(s) && 'text-muted-foreground/60 data-[disabled]:opacity-60'
      );

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
            disabled={loading}
            aria-label="Mais ações"
          >
            {loading ? <LoadingGif size="sm" /> : <MoreVertical className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52" onClick={(e: MouseEvent) => e.stopPropagation()}>
          <DropdownMenuItem
            onSelect={() => {
              void openAccessModalForMember(member);
            }}
          >
            <Boxes className="mr-2 h-4 w-4" />
            Item 1
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ShieldUser className="mr-2 h-4 w-4" />
              Acessos
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-52">
              <DropdownMenuItem
                disabled={accessOptionDisabled('admin')}
                className={accessRowClass('admin')}
                onSelect={() => void handleSetMemberAccessType(member, 'admin')}
              >
                <UserStar className="mr-2 h-4 w-4 shrink-0" />
                <span className="flex-1">Admin</span>
                {isAccessCurrent('admin') ? <Check className="h-4 w-4 shrink-0 opacity-70" /> : null}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={accessOptionDisabled('creator')}
                className={accessRowClass('creator')}
                onSelect={() => void handleSetMemberAccessType(member, 'creator')}
              >
                <UserPen className="mr-2 h-4 w-4 shrink-0" />
                <span className="flex-1">Creator</span>
                {isAccessCurrent('creator') ? <Check className="h-4 w-4 shrink-0 opacity-70" /> : null}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={accessOptionDisabled('user')}
                className={accessRowClass('user')}
                onSelect={() => void handleSetMemberAccessType(member, 'user')}
              >
                <UserKey className="mr-2 h-4 w-4 shrink-0" />
                <span className="flex-1">User</span>
                {isAccessCurrent('user') ? <Check className="h-4 w-4 shrink-0 opacity-70" /> : null}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Zap className="mr-2 h-4 w-4" />
              Status
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-52">
              <DropdownMenuItem
                disabled={statusOptionDisabled('active')}
                className={statusRowClass('active')}
                onSelect={() => void handleSetMemberLifecycleStatus(member, 'active')}
              >
                <Power className="mr-2 h-4 w-4 shrink-0" />
                <span className="flex-1">Ativo</span>
                {isLifecycleCurrent('active') ? <Check className="h-4 w-4 shrink-0 opacity-70" /> : null}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={statusOptionDisabled('archived')}
                className={statusRowClass('archived')}
                onSelect={() => void handleSetMemberLifecycleStatus(member, 'archived')}
              >
                <Archive className="mr-2 h-4 w-4 shrink-0" />
                <span className="flex-1">Arquivado</span>
                {isLifecycleCurrent('archived') ? <Check className="h-4 w-4 shrink-0 opacity-70" /> : null}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={statusOptionDisabled('deleted')}
                className={statusRowClass('deleted')}
                onSelect={() => void handleSetMemberLifecycleStatus(member, 'deleted')}
              >
                <Trash className="mr-2 h-4 w-4 shrink-0" />
                <span className="flex-1">Excluído</span>
                {isLifecycleCurrent('deleted') ? <Check className="h-4 w-4 shrink-0 opacity-70" /> : null}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const filtered = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    const neon = neonMeta[emailNeonKey(m.email)];
    return (
      (m.name ?? '').toLowerCase().includes(q) ||
      (m.email ?? '').toLowerCase().includes(q) ||
      (m.role ?? '').toLowerCase().includes(q) ||
      (m.accessType ?? '').toLowerCase().includes(q) ||
      (neon?.departamento ?? '').toLowerCase().includes(q) ||
      (neon?.setor ?? '').toLowerCase().includes(q)
    );
  });
  const filteredByType = filtered.filter((m) => typeFilter === 'all' || m.accessType === typeFilter);

  const promotionCandidates = members.filter((m) =>
    promoteTab === 'creators'
      ? m.accessType === 'user'
      : m.accessType === 'user' || m.accessType === 'creator'
  );

  const selectedPromotionIds = Object.entries(promotionSelection)
    .filter(([, selected]) => selected)
    .map(([id]) => id);

  const togglePromotionSelection = (userId: string) => {
    setPromotionSelection((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleCloseManageUsers = (open: boolean) => {
    setManageUsersOpen(open);
    if (!open) {
      setPromotionSelection({});
      setPromoteTab('creators');
      setPromotionSaving(false);
    }
  };

  const handleConfirmPromotions = async () => {
    if (selectedPromotionIds.length === 0) return;
    const nextRole = promoteTab === 'creators' ? 'creator' : 'admin';
    setPromotionSaving(true);
    try {
      const results = await Promise.all(
        selectedPromotionIds.map((id) => databaseService.updateUser(id, { accessType: nextRole }))
      );
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        toast.error(`Falha ao promover ${errors.length} usuário(s).`);
      } else {
        toast.success(`Usuários promovidos para ${nextRole === 'creator' ? 'creator' : 'admin'}.`);
      }
      await loadMembers();
      handleCloseManageUsers(false);
    } finally {
      setPromotionSaving(false);
    }
  };

  return (
    <MainViewFluidShell>
    <div className="space-y-6">
      <MainViewHeader
        icon={<UserKey className="h-6 w-6" />}
        title="Usuários"
        description="Usuários que criaram conta no GêLeads."
        button={
          <Button
            onClick={() => setManageUsersOpen(true)}
            className="h-10 gap-2 rounded-xl px-4 font-semibold shadow-sm shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/30"
          >
            <Settings className="h-4 w-4 shrink-0" />
            Gerenciar usuários
          </Button>
        }
      />

      <AdminControlLine
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        leftContent={
          <div className="flex max-w-full rounded-xl border border-border/60 p-1 bg-muted/30 shadow-sm transition-colors hover:border-border/80">
            {MEMBER_TYPE_FILTER_SEGMENTS.map(({ value, label, Icon }) => {
              const active = typeFilter === value;
              return (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 rounded-lg text-sm font-medium transition-all duration-300 flex items-center',
                    active
                      ? 'bg-primary text-primary-foreground shadow-md px-3'
                      : 'px-2 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )}
                  onClick={() => setTypeFilter(value)}
                  aria-pressed={active}
                  aria-label={label}
                  title={label}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <AnimatePresence initial={false}>
                    {active && (
                      <motion.span
                        initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                        animate={{ width: 'auto', opacity: 1, marginLeft: 6 }}
                        exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              );
            })}
          </div>
        }
        centerContent={
          <div className="relative group/search w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors duration-200" />
            <Input
              placeholder="Buscar por nome, e-mail, departamento, setor..."
              className="pl-8 w-full min-w-0 h-9 rounded-xl border-border/60 bg-muted/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50 text-sm"
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
        ) : filteredByType.length === 0 ? (
          (() => {
            const emptyByFilter: Record<
              'all' | 'user' | 'creator' | 'admin',
              { Icon: ComponentType<{ className?: string }>; message: string }
            > = {
              all: { Icon: UserIconLucide, message: 'Nenhum usuário encontrado.' },
              user: { Icon: UserKey, message: 'Nenhum user encontrado.' },
              creator: { Icon: UserPen, message: 'Nenhum creator encontrado.' },
              admin: { Icon: UserStar, message: 'Nenhum user encontrado.' },
            };
            const { Icon: EmptyIcon, message } = emptyByFilter[typeFilter];
            return (
              <div className="py-12 text-center text-muted-foreground">
                <EmptyIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{message}</p>
              </div>
            );
          })()
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredByType.map((member, index) => {
              const neon = neonMeta[emailNeonKey(member.email)];
              return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card
                  className="relative h-full cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 group"
                  onClick={() => handleOpenProfile(member.id)}
                >
                  <div className="absolute right-1.5 top-1.5 z-10" onClick={(e) => e.stopPropagation()}>
                    {renderMemberOverflowMenu(member)}
                  </div>
                  <CardHeader className="pb-2 pr-10 pt-4">
                    <div className="flex items-start gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
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
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-base truncate group-hover:text-primary transition-colors">
                              {member.name || '—'}
                            </CardTitle>
                            {member.profileStatus === 'archived' ? (
                              <span className="shrink-0 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                                Arquivado
                              </span>
                            ) : null}
                            {member.profileStatus === 'deleted' ? (
                              <span className="shrink-0 rounded-md border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                                Excluído
                              </span>
                            ) : null}
                          </div>
                          <CardDescription className="text-xs truncate">{member.email || '—'}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm">
                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground text-xs shrink-0">Acesso</span>
                        <span className="font-medium text-xs text-right">{memberAccessLabel(member)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground text-xs shrink-0">Departamento</span>
                        <span
                          className="font-medium text-xs truncate max-w-[58%] text-right"
                          title={neon?.departamento || undefined}
                        >
                          {neon?.departamento || '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground text-xs shrink-0">Setor</span>
                        <span
                          className="font-medium text-xs truncate max-w-[58%] text-right"
                          title={neon?.setor || undefined}
                        >
                          {neon?.setor || '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground text-xs shrink-0">Criado</span>
                        <span className="font-medium text-xs text-right tabular-nums" title="Data de cadastro (mock)">
                          {formatProfileCreatedAt(member.createdAt)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium">Nome</th>
                  <th className="text-left py-3 px-2 font-medium">E-mail</th>
                  <th className="text-left py-3 px-2 font-medium">Acesso</th>
                  <th className="text-left py-3 px-2 font-medium">Departamento</th>
                  <th className="text-left py-3 px-2 font-medium">Setor</th>
                  <th className="text-left py-3 px-2 font-medium">Criado</th>
                  <th className="text-left py-3 px-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredByType.map((member) => {
                  const neon = neonMeta[emailNeonKey(member.email)];
                  return (
                  <tr
                    key={member.id}
                    className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => handleOpenProfile(member.id)}
                  >
                    <td className="py-2 px-2 font-medium">
                      <div className="flex items-center gap-2 min-w-0">
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
                        <span className="truncate">{member.name || '—'}</span>
                        {member.profileStatus === 'archived' ? (
                          <span className="shrink-0 rounded border border-amber-500/30 bg-amber-500/10 px-1 py-0.5 text-[9px] font-semibold uppercase text-amber-700 dark:text-amber-400">
                            Arquivado
                          </span>
                        ) : null}
                        {member.profileStatus === 'deleted' ? (
                          <span className="shrink-0 rounded border border-destructive/30 bg-destructive/10 px-1 py-0.5 text-[9px] font-semibold uppercase text-destructive">
                            Excluído
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">{member.email || '—'}</td>
                    <td className="py-2 px-2">{memberAccessLabel(member)}</td>
                    <td className="py-2 px-2 text-muted-foreground truncate max-w-[140px]" title={neon?.departamento || undefined}>
                      {neon?.departamento || '—'}
                    </td>
                    <td className="py-2 px-2 text-muted-foreground truncate max-w-[140px]" title={neon?.setor || undefined}>
                      {neon?.setor || '—'}
                    </td>
                    <td className="py-2 px-2 text-muted-foreground tabular-nums whitespace-nowrap" title="Data de cadastro (mock)">
                      {formatProfileCreatedAt(member.createdAt)}
                    </td>
                    <td className="py-2 px-2 w-[52px] text-right" onClick={(e) => e.stopPropagation()}>
                      {renderMemberOverflowMenu(member)}
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminBigBox>

      <Dialog open={manageUsersOpen} onOpenChange={handleCloseManageUsers}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Gerenciar usuários</DialogTitle>
            <DialogDescription>Promova usuários para creators ou admins.</DialogDescription>
          </DialogHeader>

          <Tabs
            value={promoteTab}
            onValueChange={(v) => {
              setPromoteTab(v as 'creators' | 'admin');
              setPromotionSelection({});
            }}
            className="flex-1 min-h-0 flex flex-col"
          >
            <TabsList className="w-fit">
              <TabsTrigger value="creators">Creators</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>

            <div className="mt-4 flex-1 overflow-y-auto rounded-xl border border-border/60 p-3 space-y-2">
              {promotionCandidates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhum usuário elegível nesta aba.</p>
              ) : (
                promotionCandidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => togglePromotionSelection(candidate.id)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-left flex items-center justify-between transition-colors',
                      promotionSelection[candidate.id]
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border hover:bg-muted/30'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{candidate.name || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{candidate.email || '—'}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{memberAccessLabel(candidate)}</span>
                  </button>
                ))
              )}
            </div>
          </Tabs>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
            <Button variant="outline" onClick={() => handleCloseManageUsers(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPromotions}
              disabled={promotionSaving || selectedPromotionIds.length === 0}
            >
              {promotionSaving ? 'Confirmando...' : 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                      Gerencie os aplicativos que este usuário pode acessar
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
                <LoadingGif size="lg" />
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
                    
                    {/* Ýcone do sistema */}
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
                {savingAccess ? <LoadingGif size="sm" /> : <ShieldCheck className="w-4 h-4" />}
                {savingAccess ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={GeAdsRevokeConfirmOpen} onOpenChange={setGeAdsRevokeConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Confirmar remoção de acesso</DialogTitle>
            <DialogDescription>
              Ao remover o acesso ao hub (GêLeads), no mock todos os aplicativos desse usuário também perdem acesso. Continuar?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setGeAdsRevokeConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleConfirmGeAdsRevoke()}>
              Sim
            </Button>
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
    </MainViewFluidShell>
  );
}
