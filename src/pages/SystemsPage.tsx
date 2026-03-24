import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { databaseService, FAVORITE_LIMIT_ERROR_CODE } from '@/services/supabase';
import { FavoriteLimitDialog } from '@/components/FavoriteLimitDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  ExternalLink,
  Filter,
  RefreshCw,
  Star,
  ChevronDown,
  Calendar,
  Clock,
  Archive,
  Trash2,
  ArchiveRestore,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { Boxes } from 'lucide-react';
import { BANNER_CATEGORIES } from '@/views/profile/ProfileBanner/ProfileBannerImages';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AdminControlLine } from '@/admin/components/AdminControlLine';
import type { ViewMode } from '@/admin/components/AdminControlLine';
import type { System, Category } from '@/types';
import { LoadingGif, LoadingGifScreen } from '@/components/LoadingGif';
import { ComingSoonModal } from '@/components/ComingSoonModal';

interface UserSystemAccess {
  user_id: string;
  system_id: string;
  can_access: boolean;
  is_favorite?: boolean;
  favorite?: boolean;
}

const getSystemBanner = (systemId: string) => {
  const images = BANNER_CATEGORIES.genesis.images;
  if (!images || images.length === 0) return '';
  let hash = 0;
  for (let i = 0; i < systemId.length; i++) {
    hash = systemId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % images.length;
  return images[index];
};

export default function SystemsPage() {
  const { user: currentUser } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [userAccesses, setUserAccesses] = useState<UserSystemAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [comingSoonSystem, setComingSoonSystem] = useState<System | null>(null);
  const [archivedSystem, setArchivedSystem] = useState<System | null>(null);
  const [deletedSystem, setDeletedSystem] = useState<System | null>(null);
  const [unarchiveLoading, setUnarchiveLoading] = useState(false);
  
  const role = (currentUser?.accessType ?? '').toString().toLowerCase();
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (currentUser?.id) {
      loadData();
    }
  }, [currentUser?.id]);

  const loadData = async () => {
    if (!currentUser?.id) return;
    
    setLoading(true);

    // Painel do usuário: sempre apenas apps ativo/beta com acesso liberado (inclui admin).
    // Gestão de acessos fica no painel Admin (/admin/systems, membros, equipes).
    const { data: systemsData } = await databaseService.getSystemsForMember(currentUser.id);
    if (systemsData) setSystems(systemsData as System[]);

    const { data: categoriesData } = await databaseService.getCategories();
    setCategories((categoriesData as Category[]) ?? []);

    const { data: accessData } = await databaseService.getUserSystemAccess(currentUser.id);
    if (accessData) {
      setUserAccesses(accessData as UserSystemAccess[]);
    }

    setLoading(false);
  };

  const renderIcon = (iconPath: string, className: string = '') => {
    // Se for URL ou caminho (SVG, PNG, etc.) da tabela apps, renderizar <img>
    const isImg = iconPath?.startsWith('http') || iconPath?.startsWith('/') || iconPath?.endsWith('.svg') || iconPath?.endsWith('.png') || iconPath?.endsWith('.jpg') || iconPath?.endsWith('.jpeg');
    if (isImg) {
      return <img src={iconPath} alt="System icon" className={className} />;
    }
    // Caso contrário, usar ícone Lucide
    const Icon = (Icons as any)[iconPath];
    const IconComponent = Icon || Boxes;
    return <IconComponent className={className} />;
  };

  const handleSystemAccess = (url: string, systemId: string) => {
    const system = systems.find(s => s.id === systemId);
    if (!system) return;
    if (system.status === 'arquivado') { setArchivedSystem(system); return; }
    if (system.status === 'excluído' || system.status === 'excluido') { setDeletedSystem(system); return; }
    if (system.status === 'beta' || system.status === 'rascunho') { setComingSoonSystem(system); return; }
    window.open(url, '_blank');
  };

  const handleCardClick = (system: System) => {
    if (system.status === 'arquivado') { setArchivedSystem(system); return; }
    if (system.status === 'excluído' || system.status === 'excluido') { setDeletedSystem(system); return; }
    openDetail(system);
  };

  const handleUnarchive = async () => {
    if (!archivedSystem) return;
    setUnarchiveLoading(true);
    await databaseService.updateSystem(archivedSystem.id, { status: 'ativo' });
    await loadData();
    setUnarchiveLoading(false);
    setArchivedSystem(null);
  };

  const isFavorite = (systemId: string) => {
    const a = userAccesses.find((x) => x.system_id === systemId);
    return !!(a?.is_favorite ?? (a as any)?.favorite);
  };

  const [favoriteTogglingId, setFavoriteTogglingId] = useState<string | null>(null);
  const [favoriteLimitOpen, setFavoriteLimitOpen] = useState(false);

  const handleToggleFavorite = async (systemId: string) => {
    if (!currentUser?.id) return;
    setFavoriteTogglingId(systemId);
    const { error } = await databaseService.toggleFavorite(currentUser.id, systemId);
    if (error && typeof error === 'object' && (error as { code?: string }).code === FAVORITE_LIMIT_ERROR_CODE) {
      setFavoriteLimitOpen(true);
    } else {
      await loadData();
    }
    setFavoriteTogglingId(null);
  };

  // Categorias do dropdown: apenas as que têm pelo menos um app a que o usuário tem acesso (systems já vem restrito por acesso para membros)
  const categoriesForDropdown = useMemo(() => {
    const names = [...new Set(systems.map((s) => s.category).filter(Boolean))] as string[];
    return names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [systems]);

  // Se a categoria selecionada não existir mais na lista, voltar para "todas"
  useEffect(() => {
    if (selectedCategory !== 'all' && !categoriesForDropdown.includes(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [selectedCategory, categoriesForDropdown]);

  // Lista exibida: sistemas já restritos por acesso, filtrados por busca e categoria
  const STATUS_ORDER: Record<string, number> = {
    ativo: 0, beta: 1, rascunho: 2, arquivado: 3, excluído: 4, excluido: 4,
  };

  const filteredSystems = systems
    .filter((system) => {
      const matchesSearch =
        system.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        system.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || system.category === selectedCategory;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const oA = STATUS_ORDER[a.status ?? 'ativo'] ?? 0;
      const oB = STATUS_ORDER[b.status ?? 'ativo'] ?? 0;
      if (oA !== oB) return oA - oB;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

  const openDetail = (system: System) => {
    setSelectedSystem(system);
    setIsDetailDialogOpen(true);
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return 'Data desconhecida';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Boxes className="w-8 h-8 shrink-0" />
            Aplicativos
          </h1>
          <p className="text-muted-foreground mt-2">
            {isAdmin
              ? 'Acesse todos os seus aplicativos corporativos'
              : 'Acesse todos os seus aplicativos corporativos'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
          >
            {loading ? <LoadingGif size="sm" className="mr-2 inline-block" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Atualizar
          </Button>
        </div>
      </div>

      <AdminControlLine
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showViewToggle
        centerContent={
          <div className="relative group/search w-full max-w-3xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors duration-200" />
            <Input
              placeholder="Buscar sistemas..."
              className="pl-8 h-9 rounded-xl border-border/60 bg-muted/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50 text-sm w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        }
        rightContent={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-9 min-w-[220px] justify-between rounded-xl border-border/60 bg-muted/50 px-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40"
              >
                <div className="flex items-center min-w-0">
                  <Filter className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{selectedCategory === 'all' ? 'Todas as categorias' : selectedCategory}</span>
                </div>
                <ChevronDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[280px] overflow-y-auto bg-white dark:bg-[#0d1520] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
              <DropdownMenuItem onClick={() => setSelectedCategory('all')} className="focus:bg-primary/20 focus:text-primary cursor-pointer">
                Todas as categorias
              </DropdownMenuItem>
              {categoriesForDropdown.map((name) => (
                <DropdownMenuItem
                  key={name}
                  onClick={() => setSelectedCategory(name)}
                  className="focus:bg-primary/20 focus:text-primary cursor-pointer"
                >
                  {name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {/* Systems Grid */}
      {loading ? (
        <LoadingGifScreen className="h-64" />
      ) : filteredSystems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2">Nenhum sistema encontrado</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Tente buscar com outros termos' : 'Nenhum sistema disponível'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <Card className="border-border/60 bg-background/40">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20">
                    <th className="text-left py-3 px-4 font-semibold">Aplicativo</th>
                    <th className="text-left py-3 px-4 font-semibold">Categoria</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-right py-3 px-4 font-semibold">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSystems.map((system) => (
                    <tr
                      key={system.id}
                      className="border-b border-border/40 hover:bg-muted/20 cursor-pointer"
                      onClick={() => handleCardClick(system)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 min-w-0">
                          {renderIcon(system.icon, 'h-4 w-4 shrink-0 object-contain')}
                          <span className="font-medium truncate">{system.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{system.category || '—'}</td>
                      <td className="py-3 px-4 text-muted-foreground capitalize">{system.status || 'ativo'}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1.5 text-primary font-medium">
                          <ExternalLink className="w-4 h-4" />
                          Abrir
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 w-full">
          {filteredSystems.map((system, index) => {
            return (
              <motion.div
                key={system.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative"
              >
                <div className={`absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10
                  ${system.status === 'excluído' || system.status === 'excluido' ? 'from-destructive/20'
                    : system.status === 'arquivado' ? 'from-slate-400/15'
                    : system.status === 'beta' ? 'from-amber-500/20'
                    : system.status === 'rascunho' ? 'from-orange-500/15'
                    : 'from-primary/20'}`} />
                
                <div
                  className={`relative h-full flex flex-col justify-between p-5 rounded-2xl border backdrop-blur-md transition-all duration-300 shadow-lg cursor-pointer
                    ${system.status === 'excluído' || system.status === 'excluido'
                      ? 'border-destructive/40 bg-white/80 dark:bg-[#0d1520]/80 hover:border-destructive/60 hover:bg-destructive/5 dark:hover:bg-destructive/10 hover:shadow-destructive/20 hover:-translate-y-1'
                      : system.status === 'arquivado'
                        ? 'border-slate-200 dark:border-white/5 bg-white/40 dark:bg-[#0d1520]/40 opacity-60 hover:opacity-90 hover:border-slate-400 dark:hover:border-white/20 hover:shadow-slate-400/10 hover:-translate-y-1'
                      : system.status === 'beta'
                        ? 'border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0d1520]/80 hover:border-amber-500/50 hover:bg-amber-500/5 dark:hover:bg-amber-500/10 hover:shadow-amber-500/15 hover:-translate-y-1'
                      : system.status === 'rascunho'
                        ? 'border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0d1520]/80 hover:border-orange-500/50 hover:bg-orange-500/5 dark:hover:bg-orange-500/10 hover:shadow-orange-500/15 hover:-translate-y-1'
                        : 'border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0d1520]/80 hover:border-primary/30 hover:bg-white/90 dark:hover:bg-[#0d1520]/90 hover:shadow-primary/5 hover:-translate-y-1'
                    }`}
                  onClick={() => handleCardClick(system)}
                >

                  {/* Header do Card */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {/* Ícone */}
                      <div className="relative group/icon">
                        <div className="absolute inset-0 bg-primary/20 blur-lg rounded-xl opacity-0 group-hover/icon:opacity-50 transition-opacity duration-500" />
                        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-white/10 dark:to-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-primary shadow-inner group-hover/icon:border-primary/30 transition-colors">
                          {renderIcon(system.icon, 'w-7 h-7 object-contain drop-shadow')}
                        </div>
                      </div>

                      {/* Nome + badge status */}
                      <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-primary transition-colors duration-300 leading-tight">
                          {system.name}
                        </h3>
                        {system.status === 'beta' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-amber-500/15 border border-amber-500/30 text-amber-500 w-fit">
                            Beta
                          </span>
                        )}
                        {system.status === 'rascunho' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-orange-500/15 border border-orange-500/30 text-orange-500 w-fit">
                            Rascunho
                          </span>
                        )}
                        {system.status === 'arquivado' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-muted/60 border border-border/50 text-muted-foreground w-fit">
                            <Archive className="w-2.5 h-2.5" /> Arquivado
                          </span>
                        )}
                        {(system.status === 'excluído' || system.status === 'excluido') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-destructive/15 border border-destructive/30 text-destructive w-fit">
                            <Trash2 className="w-2.5 h-2.5" /> Excluído
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(system.id);
                      }}
                      disabled={favoriteTogglingId === system.id}
                      className={`p-2 rounded-full transition-all duration-300 ${
                        isFavorite(system.id)
                          ? 'text-yellow-500 dark:text-yellow-400 bg-yellow-500/10 dark:bg-yellow-400/10'
                          : 'text-slate-400 dark:text-muted-foreground/50 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-yellow-500/10 dark:hover:bg-yellow-400/10'
                      }`}
                      title={isFavorite(system.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    >
                      {favoriteTogglingId === system.id ? (
                        <LoadingGif size="sm" className="shrink-0" />
                      ) : (
                        <Star className={`w-4 h-4 ${isFavorite(system.id) ? 'fill-current' : ''}`} />
                      )}
                    </button>
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 mb-6 flex flex-col">
                    <p
                      className="text-sm text-slate-600 dark:text-muted-foreground/80 line-clamp-2 leading-relaxed mb-4 min-h-[2.5rem]"
                      title={system.description}
                    >
                      {system.description}
                    </p>
                    
                    {/* Tag de Categoria */}
                    <div className="flex">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/10 shadow-sm shadow-primary/5">
                        {system.category}
                      </span>
                    </div>
                  </div>

                  {/* Footer / Ações */}
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                    <Button
                      className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 shadow-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSystemAccess(system.url, system.id);
                      }}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Acessar
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* System Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d1520] text-slate-900 dark:text-white">
          <DialogTitle className="sr-only">{selectedSystem?.name ?? 'Detalhes do sistema'}</DialogTitle>
          <DialogDescription className="sr-only">{selectedSystem?.description ?? 'Informações do sistema'}</DialogDescription>
          <div className="relative">
            {/* Header com banner Genesis */}
            <div className="h-40 relative overflow-hidden bg-slate-100 dark:bg-[#0d1520]">
              {selectedSystem && (
                <img 
                  src={getSystemBanner(selectedSystem.id)} 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
              )}
              {/* Overlay gradiente para integrar com o fundo escuro */}
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/60 to-transparent dark:from-[#0d1520] dark:via-[#0d1520]/60" />
              {/* Padrão de grid sutil */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,transparent,black)] opacity-30" />
            </div>
            
            <div className="px-8 pb-8">
              {/* Ícone flutuante */}
              <div className="-mt-10 mb-6 relative">
                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-[#0d1520] p-1.5 shadow-2xl ring-1 ring-slate-200 dark:ring-white/10">
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-white/10 dark:to-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-primary backdrop-blur-sm">
                    {selectedSystem && renderIcon(selectedSystem.icon, 'w-10 h-10 object-contain drop-shadow-md')}
                  </div>
                </div>
              </div>

              {selectedSystem && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">{selectedSystem.name}</h2>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-muted-foreground">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                          {selectedSystem.category}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 opacity-70" />
                          Criado em {formatDate(selectedSystem.createdAt)}
                        </span>
                      </div>
                      
                      {selectedSystem.next_release_version && (
                        <div className="flex flex-wrap items-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-medium mt-1">
                          <span className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                            Próximo lançamento: Versão {selectedSystem.next_release_version} 
                            {selectedSystem.next_release_date && selectedSystem.next_release_date !== 'TBA' ? ` para ${formatDate(selectedSystem.next_release_date)}` : ' (em breve)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="prose prose-invert max-w-none">
                    <p className="text-slate-600 dark:text-muted-foreground/90 leading-relaxed text-base">
                      {selectedSystem.description}
                    </p>
                  </div>

                  <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-white/5">
                    <Button
                      variant="ghost"
                      onClick={() => setIsDetailDialogOpen(false)}
                      className="hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                    >
                      Fechar
                    </Button>
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[160px] shadow-lg shadow-primary/20"
                      onClick={() => handleSystemAccess(selectedSystem.url, selectedSystem.id)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Acessar Sistema
                    </Button>
                  </div>
                </div>
              )}
            </div>
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

      <FavoriteLimitDialog open={favoriteLimitOpen} onOpenChange={setFavoriteLimitOpen} />

      {/* Modal: sistema arquivado */}
      <Dialog open={!!archivedSystem} onOpenChange={(o) => { if (!o) setArchivedSystem(null); }}>
        <DialogContent className="sm:max-w-sm rounded-2xl border border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-muted/60 border border-border/50 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5 text-muted-foreground" />
              </div>
              <DialogTitle className="text-base font-semibold">Sistema arquivado</DialogTitle>
            </div>
            <DialogDescription className="text-sm leading-relaxed">
              O sistema <span className="font-semibold text-foreground">{archivedSystem?.name}</span> está arquivado e temporariamente indisponível. Deseja desarquivá-lo e torná-lo ativo novamente?
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

      {/* Modal: sistema excluído */}
      <Dialog open={!!deletedSystem} onOpenChange={(o) => { if (!o) setDeletedSystem(null); }}>
        <DialogContent className="sm:max-w-sm rounded-2xl border border-destructive/30 bg-background/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <DialogTitle className="text-base font-semibold">Sistema excluído</DialogTitle>
            </div>
            <DialogDescription className="text-sm leading-relaxed">
              O sistema <span className="font-semibold text-foreground">{deletedSystem?.name}</span> foi excluído. Se precisar analisar ou recuperar algo, entre em contato com um administrador.
            </DialogDescription>
          </DialogHeader>
          <Button className="w-full rounded-xl mt-2" onClick={() => setDeletedSystem(null)}>
            Entendido
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
