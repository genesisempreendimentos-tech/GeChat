import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useAccessLogStore } from '@/store/accessLogStore';
import { databaseService } from '@/services/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, ExternalLink } from 'lucide-react';
import { LoadingGifScreen } from '@/components/LoadingGif';
import * as Icons from 'lucide-react';
import { useState, useEffect } from 'react';
import { System } from '@/types';

export default function FavoritesPage() {
  const { user } = useAuthStore();
  const { addLog } = useAccessLogStore();

  const [systems, setSystems] = useState<System[]>([]);
  const [userAccesses, setUserAccesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        <Card>
          <CardContent className="p-12 text-center">
            <Star className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhum sistema favoritado
            </h3>
            <p className="text-muted-foreground">
              Adicione sistemas aos favoritos clicando na estrela
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {favoriteSystems.map((system, index) => (
              <motion.div
                key={system.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="p-3 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {renderIcon(system.icon, 'w-12 h-12 object-contain')}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFavorite(system.id)}
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                        title="Remover dos favoritos"
                      >
                        <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-lg mb-2">{system.name}</CardTitle>
                    <p
                      className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[2.5rem]"
                      title={system.description ?? ''}
                    >
                      {(system.description ?? '').length > 80
                        ? `${(system.description ?? '').slice(0, 80).trim()}...`
                        : system.description ?? ''}
                    </p>

                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                        {system.category}
                      </span>
                      {system.active && (
                        <span className="flex items-center gap-1 text-xs text-green-500">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          Ativo
                        </span>
                      )}
                    </div>

                    <Button
                      className="w-full"
                      size="sm"
                      onClick={() => handleSystemAccess(system.id, system.url)}
                      disabled={!hasAccessTo(system.id)}
                      title={!hasAccessTo(system.id) ? 'Sem permissão de acesso' : undefined}
                    >
                      <ExternalLink className="w-3 h-3 mr-2" />
                      Abrir Sistema
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Você tem {favoriteSystems.length} sistema
            {favoriteSystems.length !== 1 ? 's' : ''} favoritado
            {favoriteSystems.length !== 1 ? 's' : ''}.
          </p>
        </>
      )}
    </div>
  );
}
