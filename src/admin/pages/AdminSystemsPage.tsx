import { useState, useEffect, useCallback, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ExternalLink, Search, AlertCircle, MoreVertical, Pencil, Unlock, Trash2, UserPlus, Upload, Zap, Boxes, Archive, ArchiveRestore, RefreshCw, Check, X, Loader2, SquareCheck, Rocket, TestTubeDiagonal, SquarePen, ChevronDown, FileText, Github, Filter } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppAccessAvatarRow, type AppAccessUserPreview } from '@/components/apps/AppAccessAvatarRow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { MainViewHeader } from '@/components/layout/header';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { AdminControlLine, type ViewMode } from '@/admin/components/AdminControlLine';
import { AdminBigBox } from '@/admin/components/AdminBigBox';
import { databaseService, storageService } from '@/services/supabase';
import { getAllCollaboratorsSectors } from '@/services/corporateProfile';
import { LoadingGif, LoadingGifScreen } from '@/components/LoadingGif';
import { SystemCategory, Category } from '@/types';
import { Badge } from '@/components/ui/badge';
import { ComingSoonModal } from '@/components/ComingSoonModal';
import { cn } from '@/lib/utils';
import { TabButtons, type TabButtonItem } from '@/components/ui/tab-buttons';
import ProfileCardInfoPopup from '@/components/profile/ProfileCard/ProfileCardInfoPopup';
import { useAuthStore } from '@/store/authStore';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SystemStatusIconBadge } from '@/components/systems/SystemStatusIconBadge';
/** Campo type=date dentro de Dialog: sem ícone nativo visível; clique abre o picker (via modal={false} no Dialog). */
const releaseDateInputClassName = cn(
  'h-10 w-full rounded-xl bg-background/50 focus-visible:ring-primary/20 cursor-pointer',
  'relative dark:[color-scheme:dark]',
  '[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0',
  '[&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full',
  '[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0',
  '[&::-moz-calendar-picker-indicator]:opacity-0'
);

// O array CATEGORIES original agora é carregado do banco
const STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'lancamento', label: 'Lançamento' },
  { value: 'beta', label: 'Beta' },
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'arquivado', label: 'Arquivado' },
  { value: 'excluído', label: 'Excluído' },
] as const;
const CREATE_STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo', Icon: SquareCheck },
  { value: 'lancamento', label: 'Lançamento', Icon: Rocket },
  { value: 'beta', label: 'Beta', Icon: TestTubeDiagonal },
  { value: 'rascunho', label: 'Rascunho', Icon: SquarePen },
  { value: 'arquivado', label: 'Arquivado', Icon: Archive },
] as const;
type SystemStatusTabValue = 'all' | 'ativo' | 'lancamentos' | 'beta' | 'rascunho' | 'arquivado';
const STATUS_TAB_ITEMS: ReadonlyArray<TabButtonItem<SystemStatusTabValue>> = [
  { value: 'all', label: 'Todos', Icon: Boxes },
  { value: 'ativo', label: 'Ativos', Icon: SquareCheck },
  { value: 'lancamentos', label: 'Lançamentos', Icon: Rocket },
  { value: 'beta', label: 'Betas', Icon: TestTubeDiagonal },
  { value: 'rascunho', label: 'Rascunho', Icon: SquarePen },
  { value: 'arquivado', label: 'Arquivado', Icon: Archive },
];

interface AdminSystem {
  id: string;
  name: string;
  description: string;
  icon: string;
  url: string;
  category: string;
  active: boolean;
  status?: string;
  createdAt: Date;
  next_release_version?: string;
  next_release_date?: string;
  anchor_pdf_url?: string;
  github_url?: string;
}

function renderIcon(iconPath: string, className: string = '') {
  const isImg =
    iconPath?.startsWith('http') ||
    iconPath?.startsWith('/') ||
    /\.(svg|png|jpg|jpeg)$/i.test(iconPath ?? '');
  if (isImg && iconPath) {
    return <img src={iconPath} alt="" className={className} />;
  }
  const IconComponent = (Icons as any)[iconPath] ?? Boxes;
  return <IconComponent className={className} />;
}

export default function AdminSystemsPage() {
  const createReleaseDateFieldId = useId();
  const editReleaseDateFieldId = useId();
  const { user: currentUser } = useAuthStore();
  const [systems, setSystems] = useState<AdminSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<SystemStatusTabValue>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [comingSoonSystem, setComingSoonSystem] = useState<AdminSystem | null>(null);
  const [archivedSystem, setArchivedSystem] = useState<AdminSystem | null>(null);
  const [deletedSystem, setDeletedSystem] = useState<AdminSystem | null>(null);
  const [unarchiveLoading, setUnarchiveLoading] = useState(false);

  const handleOpenSystem = (system: AdminSystem) => {
    if (system.status === 'arquivado') { setArchivedSystem(system); return; }
    if (system.status === 'excluído' || system.status === 'excluido') { setDeletedSystem(system); return; }
    if (system.status === 'beta' || system.status === 'rascunho' || system.status === 'lancamento') { setComingSoonSystem(system); return; }
    if (system.url) window.open(system.url, '_blank');
  };

  const handleUnarchive = async () => {
    if (!archivedSystem) return;
    setUnarchiveLoading(true);
    await databaseService.updateSystem(archivedSystem.id, { status: 'ativo' });
    await loadData();
    setUnarchiveLoading(false);
    setArchivedSystem(null);
  };

  type FormStatus = 'ativo' | 'lancamento' | 'beta' | 'rascunho' | 'arquivado';
  const [form, setForm] = useState<{
    name: string;
    logo: string;
    description: string;
    category: string;
    status: FormStatus;
    url: string;
    anchor_pdf_url: string;
    github_url: string;
    next_release_version: string;
    next_release_date: string;
  }>({
    name: '',
    logo: '',
    description: '',
    category: '',
    status: 'rascunho',
    url: '',
    anchor_pdf_url: '',
    github_url: '',
    next_release_version: '',
    next_release_date: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [appUsers, setAppUsers] = useState<Record<string, { id: string; name: string; avatar?: string }[]>>({});
  const [editingSystem, setEditingSystem] = useState<AdminSystem | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', logo: '', category: '' as SystemCategory, url: '', status: 'rascunho' as string, anchor_pdf_url: '', github_url: '', next_release_version: '', next_release_date: '' });
  
  // Modal de acessos em massa
  const [accessModalSystem, setAccessModalSystem] = useState<AdminSystem | null>(null);
  const [memberAccesses, setMemberAccesses] = useState<{ id: string; name: string; email: string; avatar?: string; sector?: string; canAccess: boolean; original: boolean }[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);
  const [accessSearch, setAccessSearch] = useState('');
  const [accessFilter, setAccessFilter] = useState<'all' | 'granted' | 'denied'>('all');
  const [accessSectorFilter, setAccessSectorFilter] = useState<string>('all');

  const [profileCardOpen, setProfileCardOpen] = useState(false);
  const [profileCardUserData, setProfileCardUserData] = useState<unknown>(null);
  const [profileLoadingUserId, setProfileLoadingUserId] = useState<string | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [anchorUploading, setAnchorUploading] = useState(false);
  const createLogoInputRef = useRef<HTMLInputElement>(null);
  const editLogoInputRef = useRef<HTMLInputElement>(null);
  const createAnchorInputRef = useRef<HTMLInputElement>(null);
  const editAnchorInputRef = useRef<HTMLInputElement>(null);
  const loadData = async () => {
    setLoading(true);
    const [{ data: systemsData }, { data: catsData }] = await Promise.all([
      databaseService.getSystems(),
      databaseService.getCategories(),
    ]);
    
    const list = (systemsData ?? []) as AdminSystem[];
    const cats = (catsData || []) as Category[];
    
    setSystems(list);
    setCategories(cats);

    if (list.length > 0) {
      const results = await Promise.all(
        list.map((s) => databaseService.getUsersWithAccessToApp(s.id))
      );
      const map: Record<string, { id: string; name: string; avatar?: string }[]> = {};
      list.forEach((s, i) => {
        map[s.id] = results[i]?.data ?? [];
      });
      setAppUsers(map);
    } else {
      setAppUsers({});
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const STATUS_ORDER: Record<string, number> = {
    ativo: 0, lancamento: 1, beta: 2, rascunho: 3, arquivado: 4, excluído: 5, excluido: 5,
  };

  const filtered = systems
    .filter((s) => {
      const matchSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description ?? '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'all' || s.category === selectedCategory;
      const st = (s.status ?? '').toLowerCase();
      const matchStatus =
        selectedStatus === 'all'
          ? true
          : selectedStatus === 'lancamentos'
            ? st === 'lancamento'
            : st === selectedStatus;
      return matchSearch && matchCat && matchStatus;
    })
    .sort((a, b) => {
      const oA = STATUS_ORDER[a.status ?? 'ativo'] ?? 0;
      const oB = STATUS_ORDER[b.status ?? 'ativo'] ?? 0;
      if (oA !== oB) return oA - oB;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

  const handleUpdateSystem = async () => {
    if (!editingSystem) return;
    setFormError('');
    setFormLoading(true);
    const { error } = await databaseService.updateSystem(editingSystem.id, {
      name: editForm.name.trim(),
      description: editForm.description.trim(),
      icon_url: editForm.logo.trim() || undefined,
      category: editForm.category,
      url: editForm.url.trim() || undefined,
      status: editForm.status,
      anchor_pdf_url: editForm.anchor_pdf_url.trim() || undefined,
      github_url: editForm.github_url.trim() || undefined,
      next_release_version: editForm.next_release_version.trim() || undefined,
      next_release_date: editForm.next_release_date.trim() || undefined,
    });
    setFormLoading(false);
    if (error) {
      setFormError((error as any).message ?? 'Erro ao atualizar.');
      return;
    }
    setEditingSystem(null);
    loadData();
  };

  const handleStatusChange = async (systemId: string, status: string) => {
    const { error } = await databaseService.updateSystem(systemId, { status });
    if (!error) loadData();
  };

  const handleDeleteDefinitely = async (systemId: string) => {
    const { error } = await databaseService.deleteSystem(systemId);
    if (!error) {
      setDeleteConfirmId(null);
      loadData();
    }
  };

  const handleOpenAccessModal = useCallback(async (system: AdminSystem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAccessModalSystem(system);
    setAccessSearch('');
    setAccessFilter('all');
    setAccessSectorFilter('all');
    setLoadingAccess(true);

    const [{ data: users }, { data: accesses }, sectorsData] = await Promise.all([
      databaseService.getUsers(),
      databaseService.getUsersWithAccessToApp(system.id),
      getAllCollaboratorsSectors()
    ]);

    const userList = (users ?? []) as any[];
    const accessList = (accesses ?? []) as any[];
    const accessMap = new Set(accessList.map(a => a.id));
    
    // Extrai setores únicos
    const uniqueSectors = new Set<string>();

    const mapped = userList.map((u: any) => {
      const hasAccess = accessMap.has(u.id);
      const sector = sectorsData[u.email?.toLowerCase()] || '';
      if (sector) uniqueSectors.add(sector);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        sector,
        canAccess: hasAccess,
        original: hasAccess,
      };
    });

    mapped.sort((a, b) => {
      if (a.canAccess !== b.canAccess) return a.canAccess ? -1 : 1;
      return (a.name || a.email || '').localeCompare(b.name || b.email || '', 'pt-BR');
    });

    setSectors(Array.from(uniqueSectors).sort((a, b) => a.localeCompare(b, 'pt-BR')));
    setMemberAccesses(mapped);
    setLoadingAccess(false);
  }, []);

  const handleAppAccessUserClick = useCallback(async (user: AppAccessUserPreview) => {
    setProfileLoadingUserId(user.id);
    const { data } = await databaseService.getProfileForPopupByUserId(user.id);
    setProfileLoadingUserId(null);
    if (data) {
      setProfileCardUserData(data);
      setProfileCardOpen(true);
      return;
    }
    setProfileCardUserData({
      full_name: user.name,
      avatar_url: user.avatar,
    });
    setProfileCardOpen(true);
  }, []);

  const toggleMemberAccess = (userId: string) => {
    setMemberAccesses(prev =>
      prev.map(m => m.id === userId ? { ...m, canAccess: !m.canAccess } : m)
    );
  };

  const handleGrantAllSector = (sector: string) => {
    setMemberAccesses(prev =>
      prev.map(m => m.sector === sector ? { ...m, canAccess: true } : m)
    );
  };

  const handleRevokeAllSector = (sector: string) => {
    setMemberAccesses(prev =>
      prev.map(m => m.sector === sector ? { ...m, canAccess: false } : m)
    );
  };

  const handleSaveAccess = async () => {
    if (!accessModalSystem) return;
    setSavingAccess(true);

    const changed = memberAccesses.filter(m => m.canAccess !== m.original);
    await Promise.all(
      changed.map(m =>
        databaseService.setUserSystemAccess(m.id, accessModalSystem.id, m.canAccess)
      )
    );

    // Update appUsers locally so UI updates instantly
    const { data } = await databaseService.getUsersWithAccessToApp(accessModalSystem.id);
    setAppUsers((prev) => ({ ...prev, [accessModalSystem.id]: data ?? [] }));

    setMemberAccesses(prev => prev.map(m => ({ ...m, original: m.canAccess })));
    setSavingAccess(false);
    // setAccessModalSystem(null); // Keep open if they want to do more changes, or close. Let's keep the user's choice to close manually or close on success.
    // Close on success
    setAccessModalSystem(null);
  };

  const filteredAccesses = memberAccesses.filter(m => {
    const q = accessSearch.toLowerCase();
    const matchSearch = !q || (m.name ?? '').toLowerCase().includes(q) || (m.email ?? '').toLowerCase().includes(q);
    const matchFilter =
      accessFilter === 'all' ? true :
      accessFilter === 'granted' ? m.canAccess :
      !m.canAccess;
    const matchSector = accessSectorFilter === 'all' || m.sector === accessSectorFilter;
    return matchSearch && matchFilter && matchSector;
  });

  const changedCount = memberAccesses.filter(m => m.canAccess !== m.original).length;
  const grantedCount = memberAccesses.filter(m => m.canAccess).length;

  const openEditModal = (system: AdminSystem) => {
    // Adia após o DropdownMenu fechar para não combinar com pointer-outside do Dialog (flicker).
    setTimeout(() => {
      setEditingSystem(system);
      setEditForm({
        name: system.name,
        description: system.description ?? '',
        logo: typeof system.icon === 'string' && (system.icon.startsWith('http') || system.icon.startsWith('/')) ? system.icon : '',
        category: (system.category as SystemCategory) ?? 'Ferramentas',
        url: system.url ?? '',
        status: system.status ?? 'rascunho',
        anchor_pdf_url: (system as any).anchor_pdf_url ?? '',
        github_url: (system as any).github_url ?? '',
        next_release_version: system.next_release_version ?? '',
        next_release_date: system.next_release_date ?? '',
      });
      setFormError('');
    }, 0);
  };

  const handleCreate = async () => {
    setFormError('');
    if (!form.name.trim()) {
      setFormError('Nome é obrigatório.');
      return;
    }
    setFormLoading(true);
    const { data, error } = await databaseService.createSystem({
      name: form.name.trim(),
      icon_url: form.logo.trim() || undefined,
      description: form.description.trim(),
      category: form.category,
      status: form.status,
      url: form.url.trim() || undefined,
      anchor_pdf_url: form.anchor_pdf_url.trim() || undefined,
      github_url: form.github_url.trim() || undefined,
      next_release_version: form.next_release_version.trim() || undefined,
      next_release_date: form.next_release_date.trim() || undefined,
    });
    setFormLoading(false);
    if (error) {
      setFormError((error as any).message ?? 'Erro ao criar aplicativo.');
      return;
    }
    if (data) {
      setSystems((prev) => [...prev, data as AdminSystem].sort((a, b) => a.name.localeCompare(b.name)));
      setIsCreateOpen(false);
      setForm({ name: '', logo: '', description: '', category: categories[0]?.name || '', status: 'rascunho', url: '', anchor_pdf_url: '', github_url: '', next_release_version: '', next_release_date: '' });
    }
  };

  const handleLogoUpload = useCallback(async (file: File, setLogo: (url: string) => void) => {
    setLogoUploading(true);
    setFormError('');
    const { url, error } = await storageService.uploadSystemImage(file);
    setLogoUploading(false);
    if (error || !url) {
      setFormError('Falha no upload da imagem. Verifique o bucket GeImage no Supabase.');
      return;
    }
    setLogo(url);
  }, []);

  const handleAnchorPdfUpload = useCallback(async (file: File, setPdfUrl: (url: string) => void) => {
    setAnchorUploading(true);
    setFormError('');
    const { url, error } = await storageService.uploadSystemAnchorPdf(file);
    setAnchorUploading(false);
    if (error || !url) {
      setFormError('Falha no upload do PDF. Verifique o bucket Files/GeApps - Public/Ancora no Supabase.');
      return;
    }
    setPdfUrl(url);
  }, []);

  return (
    <MainViewFluidShell>
    <TooltipProvider delayDuration={200}>
    <div className="space-y-6">
      <MainViewHeader
        icon={<Boxes className="h-6 w-6" />}
        title="Aplicativos"
        description="Gerencie os aplicativos disponíveis no GêApps."
        button={
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="h-10 rounded-xl px-4 font-semibold shadow-sm shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar aplicativo
          </Button>
        }
      />

      <AdminControlLine
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        leftContent={
          <>
            <TabButtons<SystemStatusTabValue>
              value={selectedStatus}
              items={STATUS_TAB_ITEMS}
              onChange={setSelectedStatus}
            />
          </>
        }
        centerContent={
          <div className="relative group/search w-full max-w-[560px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors duration-200" />
            <Input
              placeholder="Buscar..."
              className="pl-10 w-full h-10 rounded-xl border-border/60 bg-muted/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        }
        rightContent={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-9 min-w-[200px] justify-between rounded-xl border-border/60 bg-muted/50 px-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40"
              >
                <div className="flex items-center min-w-0">
                  {selectedCategory === 'all' ? (
                    <Filter className="w-4 h-4 mr-2 shrink-0 text-muted-foreground/80" />
                  ) : (
                    (() => {
                      const active = categories.find((c) => c.name === selectedCategory);
                      const activeIcon = active?.icon?.trim();
                      return activeIcon ? (
                        renderIcon(activeIcon, 'w-4 h-4 mr-2 shrink-0 object-contain')
                      ) : (
                        <Boxes className="w-4 h-4 mr-2 shrink-0 text-muted-foreground/70" />
                      );
                    })()
                  )}
                  <span className="truncate">
                    {selectedCategory === 'all' ? 'Todas as categorias' : selectedCategory}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[240px] max-h-[280px] overflow-y-auto bg-white dark:bg-[#0d1520] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
            >
              <DropdownMenuItem
                onClick={() => setSelectedCategory('all')}
                className="focus:bg-primary/20 focus:text-primary cursor-pointer"
              >
                <Filter className="w-4 h-4 mr-2 shrink-0 text-muted-foreground/80" />
                <span>Todas as categorias</span>
              </DropdownMenuItem>
              {categories.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => setSelectedCategory(c.name)}
                  className="focus:bg-primary/20 focus:text-primary cursor-pointer"
                >
                  {c.icon ? renderIcon(c.icon, 'w-4 h-4 mr-2 shrink-0 object-contain') : <Boxes className="w-4 h-4 mr-2 shrink-0 text-muted-foreground/70" />}
                  <span className="truncate">{c.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
        showViewToggle
      />

      <AdminBigBox>
        {loading ? (
          <LoadingGifScreen className="h-64" />
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Boxes className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum app encontrado.</p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((system, index) => (
              <motion.div
                key={system.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group relative"
              >
                <div className={`absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10
                  ${system.status === 'excluído' || system.status === 'excluido' ? 'from-destructive/20'
                    : system.status === 'arquivado' ? 'from-slate-400/15'
                    : system.status === 'beta' ? 'from-amber-500/20'
                    : system.status === 'lancamento' ? 'from-blue-600/35'
                    : system.status === 'rascunho' ? 'from-orange-500/15'
                    : 'from-primary/10'}`} />
                
                <div className={`relative h-full flex flex-col justify-between p-5 rounded-2xl border backdrop-blur-md transition-all duration-300 shadow-lg
                  ${system.status === 'excluído' || system.status === 'excluido'
                    ? 'border-destructive/40 bg-[#0d1520]/80 hover:border-destructive/60 hover:bg-destructive/10 hover:shadow-destructive/20 hover:-translate-y-2'
                    : system.status === 'arquivado'
                      ? 'border-white/5 bg-[#0d1520]/40 opacity-60 hover:opacity-90 hover:border-white/20 hover:shadow-slate-400/10 hover:-translate-y-2'
                    : system.status === 'beta'
                      ? 'border-white/5 bg-[#0d1520]/80 hover:border-amber-500/50 hover:bg-amber-500/10 hover:shadow-amber-500/15 hover:-translate-y-2'
                    : system.status === 'lancamento'
                      ? 'border-white/5 bg-[#0d1520]/80 hover:border-blue-500 hover:bg-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-2'
                    : system.status === 'rascunho'
                      ? 'border-white/5 bg-[#0d1520]/80 hover:border-orange-500/50 hover:bg-orange-500/10 hover:shadow-orange-500/15 hover:-translate-y-2'
                      : 'border-white/5 bg-[#0d1520]/80 hover:border-primary/30 hover:bg-[#0d1520]/90 hover:shadow-primary/5 hover:-translate-y-2'
                  }`}>
                  
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative group/icon shrink-0">
                        <div className="absolute inset-0 bg-primary/20 blur-lg rounded-xl opacity-0 group-hover/icon:opacity-50 transition-opacity duration-500" />
                        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-primary shadow-inner group-hover/icon:border-primary/30 transition-colors overflow-hidden">
                          {renderIcon(system.icon, 'w-7 h-7 object-contain drop-shadow')}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-white tracking-tight truncate group-hover:text-primary transition-colors duration-300">
                          {system.name}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">{system.category}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <SystemStatusIconBadge status={system.status} variant="card" />

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10 rounded-full">
                            <MoreVertical className="w-4 h-4" />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(system)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleOpenAccessModal(system, e as any)}>
                            <Unlock className="w-4 h-4 mr-2" />
                            Acessos
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Zap className="w-4 h-4 mr-2" />
                              Status
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {STATUS_OPTIONS.map((o) => (
                                <DropdownMenuItem
                                  key={o.value}
                                  onClick={() => handleStatusChange(system.id, o.value)}
                                >
                                  {o.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          {(system.status ?? '') === 'excluído' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteConfirmId(system.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir definitivamente
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 mb-4">
                    <p className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed min-h-[2.5rem]" title={system.description}>
                      {system.description || '—'}
                    </p>
                  </div>

                  {/* Footer: acessos (AvatarGroup) + Abrir */}
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0 flex items-center">
                      {(appUsers[system.id]?.length ?? 0) > 0 ? (
                        <>
                          <AppAccessAvatarRow
                            users={appUsers[system.id] || []}
                            onUserClick={handleAppAccessUserClick}
                            onOverflowClick={() => void handleOpenAccessModal(system)}
                            loadingUserId={profileLoadingUserId}
                          />
                          <span className="ml-2 text-[10px] text-muted-foreground hidden xl:inline-block">
                            {appUsers[system.id].length}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/50 italic">Sem acessos</span>
                      )}
                    </div>

                    {(system.url || system.github_url) && (
                      <div className="flex items-center gap-2 shrink-0">
                        {system.github_url && (
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 rounded-md border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/40"
                            title="Abrir repositório no GitHub"
                            onClick={() => window.open(system.github_url, '_blank')}
                          >
                            <Github className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {system.url && (
                          <Button
                            size="sm"
                            className="h-8 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 shadow-none px-3"
                            onClick={() => handleOpenSystem(system)}
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                            Abrir
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium">Logo</th>
                  <th className="text-left py-3 px-2 font-medium">Nome</th>
                  <th className="text-left py-3 px-2 font-medium">Descrição</th>
                  <th className="text-left py-3 px-2 font-medium">Categoria</th>
                  <th className="text-left py-3 px-2 font-medium">Status</th>
                  <th className="text-left py-3 px-2 font-medium">Link</th>
                  <th className="text-left py-3 px-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((system) => (
                  <tr key={system.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-2">
                      <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center overflow-hidden">
                        {renderIcon(system.icon, 'w-6 h-6 object-contain')}
                      </div>
                    </td>
                    <td className="py-2 px-2 font-medium">{system.name}</td>
                    <td className="py-2 px-2 text-muted-foreground max-w-[200px] truncate">
                      {system.description || '—'}
                    </td>
                    <td className="py-2 px-2">{system.category}</td>
                    <td className="py-2 px-2">
                      <SystemStatusIconBadge status={system.status} variant="table" />
                    </td>
                    <td className="py-2 px-2">
                      {system.url ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 rounded-lg"
                          onClick={() => handleOpenSystem(system)}
                          title="Abrir link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1 min-w-[72px]">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                              <span className="sr-only">Ações</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(system)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleOpenAccessModal(system, e as any)}>
                              <Unlock className="w-4 h-4 mr-2" />
                              Acessos
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <Zap className="w-4 h-4 mr-2" />
                                Status
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {STATUS_OPTIONS.map((o) => (
                                  <DropdownMenuItem
                                    key={o.value}
                                    onClick={() => handleStatusChange(system.id, o.value)}
                                  >
                                    {o.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            {(system.status ?? '') === 'excluído' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeleteConfirmId(system.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir definitivamente
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminBigBox>

      <Dialog modal={false} open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl">
          
          <div className="p-6 border-b border-border/40 bg-muted/20">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <DialogTitle className="text-xl font-semibold">Criar novo app</DialogTitle>
              </div>
              <DialogDescription className="text-sm">
                Preencha os campos abaixo para adicionar um novo aplicativo ao painel.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-6">
            {formError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              {/* Nome e Descrição */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Nome do app <span className="text-destructive">*</span></label>
                  <Input
                    placeholder="Ex: GêNovo"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="h-10 rounded-xl bg-background/50 focus-visible:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Descrição</label>
                  <Input
                    placeholder="Breve descrição do aplicativo"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="h-10 rounded-xl bg-background/50 focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              {/* Logo */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Ícone / Logo</label>
                <div className="flex items-start gap-4 mt-1">
                  <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
                    {form.logo ? (
                      form.logo.startsWith('http') ? (
                        <img src={form.logo} alt="Logo" className="w-10 h-10 object-contain drop-shadow" />
                      ) : (
                        <Icons.Image className="w-6 h-6 text-muted-foreground/50" />
                      )
                    ) : (
                      <Icons.Image className="w-6 h-6 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <input
                      ref={createLogoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file, (url) => setForm((f) => ({ ...f, logo: url })));
                        e.target.value = '';
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-10 rounded-xl border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
                      disabled={logoUploading}
                      onClick={() => createLogoInputRef.current?.click()}
                    >
                      {logoUploading ? <LoadingGif size="sm" className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2 text-muted-foreground" />}
                      <span className="font-normal text-muted-foreground">{logoUploading ? 'Enviando...' : 'Clique para enviar imagem'}</span>
                    </Button>
                    <p className="text-[11px] text-muted-foreground/70">Recomendado: 512x512px, formato PNG ou SVG transparente.</p>
                  </div>
                </div>
              </div>

              {/* Link */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">URL de acesso</label>
                <div className="relative">
                  <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <Input
                    placeholder="https://..."
                    value={form.url}
                    onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                    className="pl-9 h-10 rounded-xl bg-background/50 focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Descrição âncora (PDF)</label>
                  <input
                    ref={createAnchorInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAnchorPdfUpload(file, (url) => setForm((f) => ({ ...f, anchor_pdf_url: url })));
                      e.target.value = '';
                    }}
                  />
                  <div className="flex">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-10 rounded-xl border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
                      disabled={anchorUploading}
                      onClick={() => createAnchorInputRef.current?.click()}
                    >
                      {anchorUploading ? <LoadingGif size="sm" className="w-4 h-4 mr-2" /> : <FileText className="w-4 h-4 mr-2 text-muted-foreground" />}
                      {anchorUploading ? 'Enviando...' : form.anchor_pdf_url ? 'Substituir PDF' : 'Enviar PDF'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Link do GitHub</label>
                  <div className="relative">
                    <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input
                      placeholder="https://github.com/org/repo"
                      value={form.github_url}
                      onChange={(e) => setForm((f) => ({ ...f, github_url: e.target.value }))}
                      className="pl-9 h-10 rounded-xl bg-background/50 focus-visible:ring-primary/20"
                    />
                  </div>
                </div>
              </div>

              {/* Categorias e Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Categoria</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-10 justify-between rounded-xl border-border/60 bg-muted/50 px-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40"
                      >
                        <div className="flex items-center min-w-0">
                          {(() => {
                            const active = categories.find((c) => c.name === form.category);
                            const activeIcon = active?.icon?.trim();
                            return (
                              <>
                                {activeIcon
                                  ? renderIcon(activeIcon, 'w-4 h-4 mr-2 shrink-0 object-contain')
                                  : <Boxes className="w-4 h-4 mr-2 shrink-0 text-muted-foreground/70" />}
                                <span className="truncate">{active?.name || 'Selecione...'}</span>
                              </>
                            );
                          })()}
                        </div>
                        <ChevronDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[240px] max-h-[280px] overflow-y-auto bg-white dark:bg-[#0d1520] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                      {categories.length === 0 ? (
                        <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                          Nenhuma categoria cadastrada
                        </div>
                      ) : (
                        categories.map((c) => (
                          <DropdownMenuItem
                            key={c.id}
                            onClick={() => setForm((f) => ({ ...f, category: c.name }))}
                            className="focus:bg-primary/20 focus:text-primary cursor-pointer"
                          >
                            {c.icon
                              ? renderIcon(c.icon, 'w-4 h-4 mr-2 shrink-0 object-contain')
                              : <Boxes className="w-4 h-4 mr-2 shrink-0 text-muted-foreground/70" />}
                            <span className="truncate">{c.name}</span>
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Status</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-10 justify-between rounded-xl border-border/60 bg-muted/50 px-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40"
                      >
                        <div className="flex items-center min-w-0">
                          {(() => {
                            const active = CREATE_STATUS_OPTIONS.find((o) => o.value === form.status) ?? CREATE_STATUS_OPTIONS[0];
                            const StatusIcon = active.Icon;
                            return (
                              <>
                                <StatusIcon className="w-4 h-4 mr-2 shrink-0" />
                                <span className="truncate">{active.label}</span>
                              </>
                            );
                          })()}
                        </div>
                        <ChevronDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[220px] bg-white dark:bg-[#0d1520] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                      {CREATE_STATUS_OPTIONS.map((o) => {
                        const StatusIcon = o.Icon;
                        return (
                          <DropdownMenuItem
                            key={o.value}
                            onClick={() => setForm((f) => ({ ...f, status: o.value }))}
                            className="focus:bg-primary/20 focus:text-primary cursor-pointer"
                          >
                            <StatusIcon className="w-4 h-4 mr-2 shrink-0" />
                            <span>{o.label}</span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Lançamento / Versão */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Próxima Versão</label>
                  <Input
                    placeholder="Ex: 2.0"
                    value={form.next_release_version}
                    onChange={(e) => setForm((f) => ({ ...f, next_release_version: e.target.value }))}
                    className="h-10 rounded-xl bg-background/50 focus-visible:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label htmlFor={createReleaseDateFieldId} className="text-sm font-medium text-foreground">
                    Data do Lançamento
                  </label>
                  <Input
                    id={createReleaseDateFieldId}
                    type="date"
                    value={form.next_release_date === 'TBA' ? '' : form.next_release_date}
                    onChange={(e) => setForm((f) => ({ ...f, next_release_date: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') return;
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
                        try {
                          el.showPicker?.();
                        } catch {
                          /* ignorar */
                        }
                        return;
                      }
                      e.preventDefault();
                    }}
                    onPaste={(e) => e.preventDefault()}
                    disabled={form.next_release_date === 'TBA'}
                    className={cn(
                      releaseDateInputClassName,
                      !form.next_release_date || form.next_release_date === 'TBA' ? 'text-muted-foreground' : ''
                    )}
                  />
                  <label className="flex items-center gap-2 mt-1 cursor-pointer group w-fit">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={form.next_release_date === 'TBA'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm((f) => ({ ...f, next_release_date: 'TBA' }));
                          } else {
                            setForm((f) => ({ ...f, next_release_date: '' }));
                          }
                        }}
                      />
                      <div className="w-4 h-4 rounded border border-input bg-background peer-focus-visible:ring-2 peer-focus-visible:ring-primary/20 peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                        <Icons.Check className="w-3 h-3 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium group-hover:text-foreground transition-colors select-none">
                      Data ainda não prevista
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 pt-0 mt-2 flex gap-3">
            <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1 rounded-xl h-11" onClick={handleCreate} disabled={formLoading}>
              {formLoading ? <LoadingGif size="sm" className="mr-2" /> : null}
              Criar app
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Editar: modal padrão (true) evita fechar ao abrir a partir do menu ⋮ (clique fantasma no overlay). */}
      <Dialog open={!!editingSystem} onOpenChange={(open) => !open && setEditingSystem(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl">
          
          <div className="p-6 border-b border-border/40 bg-muted/20">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Pencil className="w-5 h-5 text-primary" />
                </div>
                <DialogTitle className="text-xl font-semibold">Editar app</DialogTitle>
              </div>
              <DialogDescription className="text-sm">
                Altere nome, descrição, logo, categoria e demais informações.
              </DialogDescription>
            </DialogHeader>
          </div>

          {editingSystem && (
            <>
              <div className="p-6 space-y-6">
                {formError && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6">
                  {/* Nome e Descrição */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Nome do app <span className="text-destructive">*</span></label>
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        className="h-10 rounded-xl bg-background/50 focus-visible:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Descrição</label>
                      <Input
                        value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        className="h-10 rounded-xl bg-background/50 focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* Logo */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Ícone / Logo</label>
                    <div className="flex items-start gap-4 mt-1">
                      <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
                        {editForm.logo ? (
                          (editForm.logo.startsWith('http') || editForm.logo.startsWith('/')) ? (
                            <img src={editForm.logo} alt="Logo" className="w-10 h-10 object-contain drop-shadow" />
                          ) : (
                            <Icons.Image className="w-6 h-6 text-muted-foreground/50" />
                          )
                        ) : (
                          <Icons.Image className="w-6 h-6 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-1">
                        <input
                          ref={editLogoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoUpload(file, (url) => setEditForm((f) => ({ ...f, logo: url })));
                            e.target.value = '';
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-10 rounded-xl border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
                          disabled={logoUploading}
                          onClick={() => editLogoInputRef.current?.click()}
                        >
                          {logoUploading ? <LoadingGif size="sm" className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2 text-muted-foreground" />}
                          <span className="font-normal text-muted-foreground">
                            {logoUploading ? 'Enviando...' : editForm.logo ? 'Substituir imagem' : 'Clique para enviar imagem'}
                          </span>
                        </Button>
                        <p className="text-[11px] text-muted-foreground/70">Recomendado: 512x512px, formato PNG ou SVG transparente.</p>
                      </div>
                    </div>
                  </div>

                  {/* Link */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">URL de acesso</label>
                    <div className="relative">
                      <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <Input
                        value={editForm.url}
                        onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
                        className="pl-9 h-10 rounded-xl bg-background/50 focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Descrição âncora (PDF)</label>
                      <input
                        ref={editAnchorInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAnchorPdfUpload(file, (url) => setEditForm((f) => ({ ...f, anchor_pdf_url: url })));
                          e.target.value = '';
                        }}
                      />
                      <div className="flex">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-10 rounded-xl border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
                          disabled={anchorUploading}
                          onClick={() => editAnchorInputRef.current?.click()}
                        >
                          {anchorUploading ? <LoadingGif size="sm" className="w-4 h-4 mr-2" /> : <FileText className="w-4 h-4 mr-2 text-muted-foreground" />}
                          {anchorUploading ? 'Enviando...' : editForm.anchor_pdf_url ? 'Substituir PDF' : 'Enviar PDF'}
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground/70">Bucket: Files / Pasta: GeApps - Public/Ancora</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Link do GitHub</label>
                      <div className="relative">
                        <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                        <Input
                          placeholder="https://github.com/org/repo"
                          value={editForm.github_url}
                          onChange={(e) => setEditForm((f) => ({ ...f, github_url: e.target.value }))}
                          className="pl-9 h-10 rounded-xl bg-background/50 focus-visible:ring-primary/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Categorias e Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Categoria</label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full h-10 justify-between rounded-xl border-border/60 bg-muted/50 px-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40"
                          >
                            <div className="flex items-center min-w-0">
                              {(() => {
                                const active = categories.find((c) => c.name === editForm.category);
                                const activeIcon = active?.icon?.trim();
                                return (
                                  <>
                                    {activeIcon
                                      ? renderIcon(activeIcon, 'w-4 h-4 mr-2 shrink-0 object-contain')
                                      : <Boxes className="w-4 h-4 mr-2 shrink-0 text-muted-foreground/70" />}
                                    <span className="truncate">{active?.name || 'Selecione...'}</span>
                                  </>
                                );
                              })()}
                            </div>
                            <ChevronDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[240px] max-h-[280px] overflow-y-auto bg-white dark:bg-[#0d1520] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                          {categories.length === 0 ? (
                            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                              Nenhuma categoria cadastrada
                            </div>
                          ) : (
                            categories.map((c) => (
                              <DropdownMenuItem
                                key={c.id}
                                onClick={() => setEditForm((f) => ({ ...f, category: c.name as SystemCategory }))}
                                className="focus:bg-primary/20 focus:text-primary cursor-pointer"
                              >
                                {c.icon
                                  ? renderIcon(c.icon, 'w-4 h-4 mr-2 shrink-0 object-contain')
                                  : <Boxes className="w-4 h-4 mr-2 shrink-0 text-muted-foreground/70" />}
                                <span className="truncate">{c.name}</span>
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Status</label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full h-10 justify-between rounded-xl border-border/60 bg-muted/50 px-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40"
                          >
                            <div className="flex items-center min-w-0">
                              {(() => {
                                const active = CREATE_STATUS_OPTIONS.find((o) => o.value === editForm.status) ?? CREATE_STATUS_OPTIONS[0];
                                const StatusIcon = active.Icon;
                                return (
                                  <>
                                    <StatusIcon className="w-4 h-4 mr-2 shrink-0" />
                                    <span className="truncate">{active.label}</span>
                                  </>
                                );
                              })()}
                            </div>
                            <ChevronDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[220px] bg-white dark:bg-[#0d1520] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                          {CREATE_STATUS_OPTIONS.map((o) => {
                            const StatusIcon = o.Icon;
                            return (
                              <DropdownMenuItem
                                key={o.value}
                                onClick={() => setEditForm((f) => ({ ...f, status: o.value }))}
                                className="focus:bg-primary/20 focus:text-primary cursor-pointer"
                              >
                                <StatusIcon className="w-4 h-4 mr-2 shrink-0" />
                                <span>{o.label}</span>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Lançamento / Versão */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Próxima Versão</label>
                      <Input
                        placeholder="Ex: 2.0"
                        value={editForm.next_release_version}
                        onChange={(e) => setEditForm((f) => ({ ...f, next_release_version: e.target.value }))}
                        className="h-10 rounded-xl bg-background/50 focus-visible:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-1.5 flex flex-col">
                      <label htmlFor={editReleaseDateFieldId} className="text-sm font-medium text-foreground">
                        Data do Lançamento
                      </label>
                      {editForm.next_release_date === 'TBA' ? (
                        <Input
                          type="text"
                          readOnly
                          value="Não definida"
                          className="h-10 rounded-xl bg-background/50 text-muted-foreground cursor-default"
                        />
                      ) : (
                        <Input
                          id={editReleaseDateFieldId}
                          type="date"
                          value={editForm.next_release_date}
                          onChange={(e) => setEditForm((f) => ({ ...f, next_release_date: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab') return;
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
                              try {
                                el.showPicker?.();
                              } catch {
                                /* ignorar */
                              }
                              return;
                            }
                            e.preventDefault();
                          }}
                          onPaste={(e) => e.preventDefault()}
                          className={cn(
                            releaseDateInputClassName,
                            !editForm.next_release_date ? 'text-muted-foreground' : ''
                          )}
                        />
                      )}
                      <label className="flex items-center gap-2 mt-1 cursor-pointer group w-fit">
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={editForm.next_release_date === 'TBA'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditForm((f) => ({ ...f, next_release_date: 'TBA' }));
                              } else {
                                setEditForm((f) => ({ ...f, next_release_date: '' }));
                              }
                            }}
                          />
                          <div className="w-4 h-4 rounded border border-input bg-background peer-focus-visible:ring-2 peer-focus-visible:ring-primary/20 peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                            <Icons.Check className="w-3 h-3 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium group-hover:text-foreground transition-colors select-none">
                          Data ainda não prevista
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 pt-0 mt-2 flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setEditingSystem(null)}>
                  Cancelar
                </Button>
                <Button className="flex-1 rounded-xl h-11" onClick={handleUpdateSystem} disabled={formLoading}>
                  {formLoading ? <LoadingGif size="sm" className="mr-2" /> : null}
                  Salvar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Gerenciar Acessos em Massa (aplicativo) */}
      <Dialog open={!!accessModalSystem} onOpenChange={(o) => { if (!o) setAccessModalSystem(null); }}>
        <DialogContent className="sm:max-w-lg rounded-3xl border border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-border/40 bg-muted/20 shrink-0">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {accessModalSystem && renderIcon(accessModalSystem.icon, 'w-7 h-7 object-contain drop-shadow')}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-semibold tracking-tight">{accessModalSystem?.name || '—'}</DialogTitle>
                    <DialogDescription className="text-sm mt-1">
                      Gerencie quais membros podem acessar este app
                    </DialogDescription>
                  </div>
                </div>
                {!loadingAccess && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 shadow-sm mt-1">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary whitespace-nowrap">{grantedCount} com acesso</span>
                  </div>
                )}
              </div>
            </DialogHeader>

            {/* Barra de busca + filtros */}
            <div className="flex flex-col gap-3 mt-6">
              {/* Linha 1: Busca e Filtros de Status */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:flex-1 group/search">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within/search:text-primary transition-colors duration-200" />
                  <Input
                    placeholder="Buscar membro..."
                    className="pl-9 h-10 rounded-xl bg-background/50 border-border/60 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50 w-full"
                    value={accessSearch}
                    onChange={(e) => setAccessSearch(e.target.value)}
                  />
                </div>

                <div className="flex gap-1 w-full sm:w-auto p-1 rounded-xl bg-muted/40 border border-border/40 shrink-0 overflow-x-auto">
                  {(['all', 'granted', 'denied'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setAccessFilter(f)}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                        accessFilter === f
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      {f === 'all' ? 'Todos' : f === 'granted' ? 'Com acesso' : 'Sem acesso'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Linha 2: Filtro de Setor e Ações em Massa */}
              {sectors.length > 0 && (
                <div className="flex items-center gap-2 w-full">
                  <div className="relative flex-1 sm:flex-none sm:min-w-[240px]">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-10 rounded-xl bg-background/50 border-input justify-between px-3 font-normal hover:bg-muted/50 hover:text-foreground text-foreground/80 shadow-sm transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Icons.Building2 className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                            <span className="truncate">
                              {accessSectorFilter === 'all' ? 'Todos os setores' : accessSectorFilter}
                            </span>
                          </div>
                          <Icons.ChevronDown className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0 opacity-50 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[240px] max-h-[300px] overflow-y-auto rounded-xl p-1.5">
                        <DropdownMenuItem
                          onClick={() => setAccessSectorFilter('all')}
                          className={cn(
                            "cursor-pointer rounded-lg py-2",
                            accessSectorFilter === 'all' ? "bg-primary/10 text-primary font-medium focus:bg-primary/15 focus:text-primary" : ""
                          )}
                        >
                          Todos os setores
                          {accessSectorFilter === 'all' && <Icons.Check className="w-4 h-4 ml-auto text-primary" />}
                        </DropdownMenuItem>
                        {sectors.map(s => (
                          <DropdownMenuItem
                            key={s}
                            onClick={() => setAccessSectorFilter(s)}
                            className={cn(
                              "cursor-pointer rounded-lg py-2",
                              accessSectorFilter === s ? "bg-primary/10 text-primary font-medium focus:bg-primary/15 focus:text-primary" : ""
                            )}
                          >
                            {s}
                            {accessSectorFilter === s && <Icons.Check className="w-4 h-4 ml-auto text-primary" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {accessSectorFilter !== 'all' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-10 rounded-xl shadow-sm px-3 border-border hover:bg-muted/60 text-muted-foreground hover:text-foreground shrink-0">
                          <Icons.Settings2 className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Ações do Setor</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
                        <DropdownMenuItem onClick={() => handleGrantAllSector(accessSectorFilter)} className="text-primary focus:text-primary focus:bg-primary/10 rounded-lg cursor-pointer py-2">
                          <Icons.CheckCircle2 className="w-4 h-4 mr-2" />
                          Liberar para todos do setor
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRevokeAllSector(accessSectorFilter)} className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg cursor-pointer py-2">
                          <Icons.XCircle className="w-4 h-4 mr-2" />
                          Bloquear para todos do setor
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Lista de membros */}
          <div className="flex-1 overflow-y-auto p-6 space-y-2.5 min-h-0 bg-background/50">
            {loadingAccess ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                <span className="text-sm text-muted-foreground animate-pulse">Carregando membros...</span>
              </div>
            ) : filteredAccesses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                  <Search className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">Nenhum membro encontrado.</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filteredAccesses.map((member) => (
                  <motion.button
                    key={member.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => toggleMemberAccess(member.id)}
                    className={`w-full flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300 text-left group/item relative overflow-hidden ${
                      member.canAccess
                        ? 'bg-primary/5 border-primary/20 shadow-sm hover:bg-primary/10 hover:border-primary/30 hover:shadow-md'
                        : 'bg-muted/10 border-border/40 hover:bg-muted/30 hover:border-border/60 hover:shadow-sm'
                    }`}
                  >
                    {member.canAccess && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-500" />
                    )}
                    
                    {/* Avatar do membro */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 relative z-10 overflow-hidden ${
                      member.canAccess 
                        ? 'bg-primary/15 text-primary shadow-inner border border-primary/20' 
                        : 'bg-muted/50 text-muted-foreground border border-border/50 group-hover/item:bg-muted/80'
                    }`}>
                      {member.avatar ? (
                        <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold uppercase">
                          {(member.name || member.email || '?').charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 relative z-10">
                      <p className={`text-sm font-semibold truncate transition-colors duration-300 ${
                        member.canAccess ? 'text-foreground' : 'text-muted-foreground group-hover/item:text-foreground/80'
                      }`}>
                        {member.name || member.email || 'Usuário'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-medium text-muted-foreground/70 truncate">
                          {member.email || ''}
                        </span>
                        {member.sector && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-border/50 text-muted-foreground font-medium truncate max-w-[150px]">
                            {member.sector}
                          </span>
                        )}
                        {member.canAccess !== member.original && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-yellow-500/15 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 font-bold uppercase tracking-wider animate-in fade-in zoom-in duration-300">
                            alterado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Toggle */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 relative z-10 border-2 ${
                      member.canAccess
                        ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20 scale-110'
                        : 'bg-transparent border-muted-foreground/30 text-transparent group-hover/item:border-muted-foreground/50 scale-100'
                    }`}>
                      <Check className={`w-3.5 h-3.5 transition-transform duration-300 ${member.canAccess ? "scale-100" : "scale-0"}`} strokeWidth={3} />
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
              <Button variant="outline" className="rounded-xl h-10 px-4" onClick={() => setAccessModalSystem(null)}>
                Cancelar
              </Button>
              <Button
                className={`rounded-xl h-10 px-5 gap-2 transition-all duration-300 ${
                  changedCount > 0 && !savingAccess ? "shadow-lg shadow-primary/25 hover:shadow-primary/40" : ""
                }`}
                onClick={handleSaveAccess}
                disabled={savingAccess || changedCount === 0}
              >
                {savingAccess ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                {savingAccess ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação Excluir definitivamente */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir definitivamente</DialogTitle>
            <DialogDescription>
              Este app será removido do banco de dados. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => deleteConfirmId && handleDeleteDefinitely(deleteConfirmId)}
            >
              Excluir
            </Button>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ComingSoonModal
        open={!!comingSoonSystem}
        onClose={() => setComingSoonSystem(null)}
        systemName={comingSoonSystem?.name}
        systemUrl={comingSoonSystem?.url}
        status={comingSoonSystem?.status}
      />

      {/* Modal: aplicativo arquivado */}
      <Dialog open={!!archivedSystem} onOpenChange={(o) => { if (!o) setArchivedSystem(null); }}>
        <DialogContent className="sm:max-w-sm rounded-2xl border border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-muted/60 border border-border/50 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5 text-muted-foreground" />
              </div>
              <DialogTitle className="text-base font-semibold">aplicativo arquivado</DialogTitle>
            </div>
            <DialogDescription className="text-sm leading-relaxed">
              O aplicativo <span className="font-semibold text-foreground">{archivedSystem?.name}</span> está arquivado e temporariamente indisponível. Deseja desarquivá-lo e torná-lo ativo novamente?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setArchivedSystem(null)} disabled={unarchiveLoading}>
              Não
            </Button>
            <Button className="flex-1 rounded-xl gap-2" onClick={handleUnarchive} disabled={unarchiveLoading}>
              {unarchiveLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArchiveRestore className="w-4 h-4" />}
              Sim, desarquivar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: aplicativo excluído */}
      <Dialog open={!!deletedSystem} onOpenChange={(o) => { if (!o) setDeletedSystem(null); }}>
        <DialogContent className="sm:max-w-sm rounded-2xl border border-destructive/30 bg-background/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <DialogTitle className="text-base font-semibold">aplicativo excluído</DialogTitle>
            </div>
            <DialogDescription className="text-sm leading-relaxed">
              O aplicativo <span className="font-semibold text-foreground">{deletedSystem?.name}</span> foi excluído. Se precisar analisar ou recuperar algo, entre em contato com um administrador.
            </DialogDescription>
          </DialogHeader>
          <Button className="w-full rounded-xl mt-2" onClick={() => setDeletedSystem(null)}>
            Entendido
          </Button>
        </DialogContent>
      </Dialog>

      <ProfileCardInfoPopup
        open={profileCardOpen}
        onOpenChange={setProfileCardOpen}
        userData={profileCardUserData}
        currentUser={currentUser}
      />
    </div>
    </TooltipProvider>
    </MainViewFluidShell>
  );
}
