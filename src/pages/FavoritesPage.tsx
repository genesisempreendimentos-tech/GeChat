import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useAccessLogStore } from '@/store/accessLogStore';
import { databaseService } from '@/services/supabase';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star, ExternalLink, Calendar } from 'lucide-react';
import { LoadingGifScreen, LoadingGif } from '@/components/LoadingGif';
import * as Icons from 'lucide-react';
import { useState, useEffect } from 'react';
import { System } from '@/types';
import { BANNER_CATEGORIES } from '@/views/profile/ProfileBanner/ProfileBannerImages';

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
  const { addLog } = useAccessLogStore();

  const [systems, setSystems] = useState<System[]>([]);
  const [userAccesses, setUserAccesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [favoriteTogglingId, setFavoriteTogglingId] = useState<string | null>(null);

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
      const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
      // Membros veem apenas apps com acesso liberado; admin/manager veem todos
      if (isAdminOrManager) {
        const { data: systemsData, error: systemsError } = await databaseService.getSystems();
        if (systemsError) console.error('Erro ao carregar sistemas:', systemsError);
        setSystems(systemsData || []);
      } else {
        const { data: systemsData, error: systemsError } = await databaseService.getSystemsForMember(user.id);
        if (systemsError) console.error('Erro ao carregar sistemas:', systemsError);
        setSystems(systemsData || []);
      }

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
    const access = userAccesses.find((a: any) => a.system_id === system.id);
    return !!(access?.is_favorite ?? access?.favorite);
  });

  const hasAccessTo = (systemId: string) =>
    user?.role === 'admin' || user?.role === 'manager'
      ? true
      : userAccesses.some((a: any) => a.system_id === systemId && a.can_access);

  const renderIcon = (iconPath: string, className: string = '') => {
    // Se for URL ou caminho (SVG, PNG, etc.) da tabela apps, renderizar <img>
    const isImg = iconPath?.startsWith('http') || iconPath?.startsWith('/') || iconPath?.endsWith('.svg') || iconPath?.endsWith('.png') || iconPath?.endsWith('.jpg') || iconPath?.endsWith('.jpeg');
    if (isImg) {
      return <img src={iconPath} alt="System icon" className={className} />;
    }
    // Caso contrário, usar ícone Lucide
    const Icon = (Icons as any)[iconPath];
    const IconComponent = Icon || Icons.AppWindow;
    return <IconComponent className={className} />;
  };

  const handleSystemAccess = (systemId: string, url: string) => {
    addLog(user?.id || '', systemId);
    window.open(url, '_blank');
  };

  const handleRemoveFavorite = async (systemId: string) => {
    if (!user?.id) return;
    await databaseService.toggleFavorite(user.id, systemId);
    await loadData(); // Recarregar dados
  };

  const openDetail = (system: System) => {
    setSelectedSystem(system);
    setIsDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
          Favoritos
        </h1>
        <p className="text-muted-foreground mt-2">
          Seus sistemas favoritos para acesso rápido
        </p>
      </div>

      {loading ? (
        <LoadingGifScreen className="h-64" />
      ) : favoriteSystems.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
          <Star className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-semibold mb-2">
            Nenhum sistema favoritado
          </h3>
          <p className="text-muted-foreground">
            Adicione sistemas aos favoritos clicando na estrela na página de sistemas
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 w-full">
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
                    <div className="flex items-center gap-4">
                      {/* Ícone */}
                      <div className="relative group/icon">
                        <div className="absolute inset-0 bg-primary/20 blur-lg rounded-xl opacity-0 group-hover/icon:opacity-50 transition-opacity duration-500" />
                        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-white/10 dark:to-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-primary shadow-inner group-hover/icon:border-primary/30 transition-colors">
                          {renderIcon(system.icon, 'w-7 h-7 object-contain drop-shadow')}
                        </div>
                      </div>
                      
                      {/* Nome */}
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-primary transition-colors duration-300">
                          {system.name}
                        </h3>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFavorite(system.id);
                      }}
                      className="p-2 rounded-full transition-all duration-300 text-yellow-500 dark:text-yellow-400 bg-yellow-500/10 dark:bg-yellow-400/10 hover:bg-yellow-500/20 dark:hover:bg-yellow-400/20"
                      title="Remover dos favoritos"
                    >
                      <Star className="w-4 h-4 fill-current" />
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

          <p className="text-sm text-muted-foreground text-center pt-4">
            Você tem {favoriteSystems.length} sistema
            {favoriteSystems.length !== 1 ? 's' : ''} favoritado
            {favoriteSystems.length !== 1 ? 's' : ''}.
          </p>
        </>
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
    </div>
  );
}
