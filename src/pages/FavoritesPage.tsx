import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { databaseService, FAVORITE_LIMIT_ERROR_CODE } from '@/services/supabase';
import { FavoriteLimitDialog } from '@/components/FavoriteLimitDialog';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star, ExternalLink, Calendar, Plus, Search, Boxes } from 'lucide-react';
import { LoadingGifScreen, LoadingGif } from '@/components/LoadingGif';
import * as Icons from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { System } from '@/types';
import { BANNER_CATEGORIES } from '@/views/profile/ProfileBanner/ProfileBannerImages';
import { ComingSoonModal } from '@/components/ComingSoonModal';
import { cn } from '@/lib/utils';
import { TRANSLUCENT_BIG_BOX } from '@/lib/translucentBigBox';
import { MainViewHeader } from '@/components/layout/header';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { isAppEligibleForFavoriteShortcut } from '@/lib/appFavoriteEligibility';
import { emitFavoritesChanged } from '@/lib/favoritesEvents';

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

const formatDate = (date?: Date | string) => {
  if (!date) return 'Data desconhecida';
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export default function FavoritesPage() {
  const { user } = useAuthStore();

  const [systems, setSystems] = useState<System[]>([]);
  const [userAccesses, setUserAccesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [favoriteTogglingId, setFavoriteTogglingId] = useState<string | null>(null);
  const [favoriteLimitOpen, setFavoriteLimitOpen] = useState(false);
  const [comingSoonSystem, setComingSoonSystem] = useState<System | null>(null);
  const [manageFavoritesOpen, setManageFavoritesOpen] = useState(false);
  const [manageFavoritesSearch, setManageFavoritesSearch] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      // Igual à SystemsPage: só apps com acesso liberado (access = true) e status ativo/beta/active no back-end.
      const { data: systemsData, error: systemsError } = await databaseService.getSystemsForMember(user.id);
      if (systemsError) console.error('Erro ao carregar sistemas:', systemsError);
      setSystems(systemsData || []);

      // Carregar acessos do usuário (favoritos)
      const { data: accessData, error: accessError } = await databaseService.getUserSystemAccess(user.id);
      if (accessError) {
        console.error('Erro ao carregar acessos:', accessError);
      }
      setUserAccesses(accessData || []);
    } catch (error) {
      console.error('Erro geral ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const favoriteSystems = systems.filter((system) => {
    if (!isAppEligibleForFavoriteShortcut(system.status)) return false;
    const access = userAccesses.find((a: any) => a.system_id === system.id);
    return !!(access?.is_favorite ?? access?.favorite);
  });

  const isFavorite = (systemId: string) => {
    const access = userAccesses.find((a: any) => a.system_id === systemId);
    return !!(access?.is_favorite ?? access?.favorite);
  };

  const appsLiberados = useMemo(() => {
    return systems
      .filter((system) => isAppEligibleForFavoriteShortcut(system.status))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [systems]);

  const filteredAppsForManageModal = useMemo(() => {
    const q = manageFavoritesSearch.trim().toLowerCase();
    if (!q) return appsLiberados;
    return appsLiberados.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category ?? '').toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q),
    );
  }, [appsLiberados, manageFavoritesSearch]);

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

  const handleSystemAccess = (systemId: string, url: string) => {
    const system = systems.find(s => s.id === systemId);
    if (system && (system.status === 'beta' || system.status === 'rascunho')) {
      setComingSoonSystem(system);
      return;
    }
    window.open(url, '_blank');
  };

  const handleToggleFavorite = async (systemId: string) => {
    if (!user?.id) return;
    setFavoriteTogglingId(systemId);
    const { error } = await databaseService.toggleFavorite(user.id, systemId);
    if (error && typeof error === 'object' && (error as { code?: string }).code === FAVORITE_LIMIT_ERROR_CODE) {
      setFavoriteLimitOpen(true);
    } else {
      emitFavoritesChanged();
      await loadData();
    }
    setFavoriteTogglingId(null);
  };

  const openDetail = (system: System) => {
    setSelectedSystem(system);
    setIsDetailDialogOpen(true);
  };

  return (
    <MainViewFluidShell>
    <div className="space-y-6">
      <MainViewHeader
        icon={<Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />}
        title="Favoritos"
        description="Seus sistemas favoritos para acesso rápido."
        button={
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-xl px-4 font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 sm:w-auto"
            onClick={() => {
              setManageFavoritesSearch('');
              setManageFavoritesOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar favoritos
          </Button>
        }
      />

      {loading ? (
        <LoadingGifScreen className="h-64" />
      ) : favoriteSystems.length === 0 ? (
        <div className={cn(TRANSLUCENT_BIG_BOX, 'p-12 text-center')}>
          <Star className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-semibold mb-2">
            Nenhum sistema favoritado
          </h3>
          <p className="text-muted-foreground">
            Use <span className="font-medium text-foreground">Adicionar favoritos</span> acima ou a estrela na página de aplicativos.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
            {favoriteSystems.map((system, index) => (
              <motion.div
                key={system.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10" />
                
                <div 
                  className="relative h-full flex flex-col justify-between p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0d1520]/80 backdrop-blur-md hover:border-primary/30 hover:bg-white/90 dark:hover:bg-[#0d1520]/90 transition-all duration-300 shadow-lg hover:shadow-primary/5 hover:-translate-y-1 cursor-pointer"
                  onClick={() => openDetail(system)}
                >
                  
                  {/* Header do Card */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Ícone */}
                      <div className="relative group/icon shrink-0">
                        <div className="absolute inset-0 bg-primary/20 blur-lg rounded-xl opacity-0 group-hover/icon:opacity-50 transition-opacity duration-500" />
                        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-white/10 dark:to-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-primary shadow-inner group-hover/icon:border-primary/30 transition-colors">
                          {renderIcon(system.icon, 'w-7 h-7 object-contain drop-shadow')}
                        </div>
                      </div>
                      
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate group-hover:text-primary transition-colors duration-300">
                          {system.name}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">{system.category}</p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(system.id);
                      }}
                      disabled={favoriteTogglingId === system.id}
                      className="p-2 rounded-full transition-all duration-300 text-yellow-500 dark:text-yellow-400 bg-yellow-500/10 dark:bg-yellow-400/10 hover:bg-yellow-500/20 dark:hover:bg-yellow-400/20 disabled:opacity-60"
                      title="Remover dos favoritos"
                    >
                      {favoriteTogglingId === system.id ? (
                        <LoadingGif size="sm" className="shrink-0" />
                      ) : (
                        <Star className="w-4 h-4 fill-current" />
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
                  </div>

                  {/* Footer / Ações */}
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                    <Button
                      className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 shadow-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSystemAccess(system.id, system.url);
                      }}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Acessar
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </>
      )}

      <Dialog
        open={manageFavoritesOpen}
        onOpenChange={(open) => {
          setManageFavoritesOpen(open);
          if (!open) setManageFavoritesSearch('');
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden sm:max-w-lg">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0 space-y-0 text-left">
            <div className="flex items-start gap-4 pr-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                <Star className="w-7 h-7 text-yellow-500 fill-yellow-500" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <DialogTitle className="text-lg font-semibold leading-tight tracking-tight">
                  Adicionar favoritos
                </DialogTitle>
                <DialogDescription className="text-sm leading-snug">
                  Aplicativos liberados para você. Adicione ou remova atalhos na sua lista de favoritos.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 pt-4 shrink-0">
            <div className="relative group/search w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within/search:text-primary transition-colors" />
              <Input
                placeholder="Buscar aplicativo…"
                className="pl-9 h-10 rounded-xl bg-background/50 border-border/60 shadow-sm w-full"
                value={manageFavoritesSearch}
                onChange={(e) => setManageFavoritesSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            {filteredAppsForManageModal.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                  <Boxes className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground font-medium px-4">
                  {appsLiberados.length === 0
                    ? 'Nenhum aplicativo liberado para sua conta.'
                    : 'Nenhum aplicativo encontrado para a busca.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 pb-2">
                {filteredAppsForManageModal.map((system) => (
                  <div
                    key={system.id}
                    className="w-full flex items-center gap-4 p-3 rounded-2xl border border-border/40 bg-muted/10 transition-colors duration-200"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-white/10 dark:to-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-primary shrink-0 overflow-hidden">
                      {renderIcon(system.icon, 'w-7 h-7 object-contain')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{system.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {system.category || 'Sem categoria'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={isFavorite(system.id) ? 'outline' : 'default'}
                      className={cn(
                        'shrink-0 rounded-xl h-9 px-3 font-semibold min-w-[5.5rem]',
                        isFavorite(system.id) &&
                          'border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive',
                      )}
                      disabled={favoriteTogglingId === system.id}
                      onClick={() => handleToggleFavorite(system.id)}
                    >
                      {favoriteTogglingId === system.id ? (
                        <LoadingGif size="sm" className="shrink-0" />
                      ) : isFavorite(system.id) ? (
                        'Remover'
                      ) : (
                        'Adicionar'
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <FavoriteLimitDialog open={favoriteLimitOpen} onOpenChange={setFavoriteLimitOpen} />

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
                          Criado em {formatDate((selectedSystem as any).createdAt)}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-medium mt-1">
                        <span className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                          {(() => {
                            const nextVersion = String((selectedSystem as any).next_release_version ?? '').trim();
                            const hasNextVersion = nextVersion.length > 0 && !['0', '0.0', '0.0.0'].includes(nextVersion);
                            const releaseDate = String((selectedSystem as any).next_release_date ?? '').trim();
                            const hasDefinedDate = Boolean(releaseDate) && releaseDate !== 'TBA';
                            return hasNextVersion
                              ? `Próxima versão: ${nextVersion}${hasDefinedDate ? ` (lançamento em ${formatDate(releaseDate)})` : ' (data ainda não prevista)'}`
                              : 'Sem previsão de nova versão no momento';
                          })()}
                        </span>
                      </div>
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
                      onClick={() => handleSystemAccess(selectedSystem.id, selectedSystem.url)}
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
    </div>
    </MainViewFluidShell>
  );
}
