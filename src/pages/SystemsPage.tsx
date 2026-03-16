import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { databaseService } from '@/services/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Search,
  ExternalLink,
  Filter,
  Plus,
  Users,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Star,
  ChevronDown,
  Calendar,
  Clock,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { BANNER_CATEGORIES } from '@/views/profile/ProfileBanner/ProfileBannerImages';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SystemCategory, Category } from '@/types';
import { LoadingGif, LoadingGifScreen } from '@/components/LoadingGif';

interface System {
  id: string;
  name: string;
  description: string;
  icon: string;
  url: string;
  category: SystemCategory;
  active: boolean;
  createdAt?: Date | string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userAccesses, setUserAccesses] = useState<UserSystemAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isAddSystemDialogOpen, setIsAddSystemDialogOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [userToRevoke, setUserToRevoke] = useState<{ userId: string; userName: string } | null>(null);
  const [permissionLoading, setPermissionLoading] = useState(false);
  
  const [newSystem, setNewSystem] = useState({
    name: '',
    description: '',
    icon: 'AppWindow',
    url: '',
    category: '' as SystemCategory,
  });
  const [formError, setFormError] = useState('');

  const role = (currentUser?.role ?? '').toString().toLowerCase();
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isAdminOrManager = isAdmin || isManager;

  useEffect(() => {
    if (currentUser?.id) {
      loadData();
    }
  }, [currentUser?.id]);

  const loadData = async () => {
    if (!currentUser?.id) return;
    
    setLoading(true);

    const userIsAdminOrManager = currentUser.role === 'admin' || currentUser.role === 'manager';
    // Membros veem apenas apps ativo/beta com acesso liberado; admin/manager veem todos para gerenciar
    if (userIsAdminOrManager) {
      const { data: systemsData } = await databaseService.getSystems();
      if (systemsData) setSystems(systemsData as System[]);
    } else {
      const { data: systemsData } = await databaseService.getSystemsForMember(currentUser.id);
      if (systemsData) setSystems(systemsData as System[]);
    }

    const { data: categoriesData } = await databaseService.getCategories();
    setCategories((categoriesData as Category[]) ?? []);

    if (userIsAdminOrManager) {
      const { data: usersData } = await databaseService.getUsers();
      if (usersData) {
        setUsers(usersData.map((u: any) => ({
          id: u.id,
          name: u.name || u.email,
          email: u.email,
          role: u.role,
        })));
      }
    }

    const { data: accessData } = await databaseService.getUserSystemAccess(currentUser.id);
    if (accessData) {
      setUserAccesses(accessData as UserSystemAccess[]);
    }

    setLoading(false);
  };

  const loadUserAccesses = async (systemId: string) => {
    setPermissionLoading(true);
    
    // Carregar acessos de todos os usuários para o sistema específico
    const accessPromises = users.map(async (user) => {
      const { data } = await databaseService.getUserSystemAccess(user.id);
      return data || [];
    });

    const allAccesses = await Promise.all(accessPromises);
    const flatAccesses = allAccesses.flat() as UserSystemAccess[];
    
    // Filtrar apenas os acessos relevantes para o sistema atual
    const relevantAccesses = flatAccesses.filter(
      (access) => access.system_id === systemId
    );
    
    // Mesclar com os acessos existentes de outros sistemas
    const otherAccesses = userAccesses.filter(
      (access) => access.system_id !== systemId
    );
    
    setUserAccesses([...otherAccesses, ...relevantAccesses]);
    setPermissionLoading(false);
  };

  const handleToggleAccess = async (userId: string, systemId: string, currentAccess: boolean) => {
    // Se já tem acesso, pedir confirmação para remover
    if (currentAccess) {
      const user = users.find(u => u.id === userId);
      setUserToRevoke({ userId, userName: user?.name || 'Usuário' });
      setIsRevokeDialogOpen(true);
      return;
    }

    // Se não tem acesso, conceder diretamente
    setPermissionLoading(true);
    const { error } = await databaseService.setUserSystemAccess(userId, systemId, true);
    
    if (!error) {
      // Atualizar apenas o acesso específico no estado
      const newAccess: UserSystemAccess = {
        user_id: userId,
        system_id: systemId,
        can_access: true,
      };
      
      // Remover acesso antigo se existir e adicionar novo
      const updatedAccesses = userAccesses.filter(
        (access) => !(access.user_id === userId && access.system_id === systemId)
      );
      setUserAccesses([...updatedAccesses, newAccess]);
    }
    
    setPermissionLoading(false);
  };

  const confirmRevokeAccess = async () => {
    if (!userToRevoke || !selectedSystem) return;

    setPermissionLoading(true);
    const { error } = await databaseService.setUserSystemAccess(
      userToRevoke.userId,
      selectedSystem.id,
      false
    );
    
    if (!error) {
      // Atualizar apenas o acesso específico no estado
      const newAccess: UserSystemAccess = {
        user_id: userToRevoke.userId,
        system_id: selectedSystem.id,
        can_access: false,
      };
      
      // Remover acesso antigo e adicionar atualizado
      const updatedAccesses = userAccesses.filter(
        (access) => !(access.user_id === userToRevoke.userId && access.system_id === selectedSystem.id)
      );
      setUserAccesses([...updatedAccesses, newAccess]);
    }
    
    setPermissionLoading(false);
    setIsRevokeDialogOpen(false);
    setUserToRevoke(null);
  };

  const handleAddSystem = async () => {
    setFormError('');
    
    if (!newSystem.name || !newSystem.url) {
      setFormError('Nome e URL são obrigatórios');
      return;
    }

    const { error } = await databaseService.createSystem({
      name: newSystem.name,
      description: newSystem.description,
      icon: newSystem.icon,
      url: newSystem.url,
      category: newSystem.category,
      active: true,
    });

    if (error) {
      setFormError('Erro ao criar sistema');
    } else {
      setNewSystem({
        name: '',
        description: '',
        icon: 'AppWindow',
        url: '',
        category: (categories[0]?.name ?? '') as SystemCategory,
      });
      setIsAddSystemDialogOpen(false);
      await loadData();
    }
  };

  const openPermissionsDialog = async (system: System) => {
    setSelectedSystem(system);
    await loadUserAccesses(system.id);
    setIsPermissionDialogOpen(true);
  };

  const hasAccess = (systemId: string) => {
    if (isAdminOrManager) return true;
    return userAccesses.some(
      (access) => access.system_id === systemId && access.can_access
    );
  };

  const getUserAccess = (userId: string, systemId: string) => {
    return userAccesses.find(
      (access) => access.user_id === userId && access.system_id === systemId
    );
  };

  const canModifyUserPermissions = (userRole: string) => {
    // Gerente pode modificar permissões de qualquer um
    if (isManager) return true;
    // Admin pode modificar apenas permissões de usuários comuns (não admin ou gerente)
    if (isAdmin && userRole !== 'admin' && userRole !== 'manager') return true;
    return false;
  };

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

  const handleSystemAccess = (url: string, systemId: string) => {
    if (currentUser?.id) {
      databaseService.logAccess(currentUser.id, systemId);
    }
    window.open(url, '_blank');
  };

  const isFavorite = (systemId: string) => {
    const a = userAccesses.find((x) => x.system_id === systemId);
    return !!(a?.is_favorite ?? (a as any)?.favorite);
  };

  const [favoriteTogglingId, setFavoriteTogglingId] = useState<string | null>(null);

  const handleToggleFavorite = async (systemId: string) => {
    if (!currentUser?.id) return;
    setFavoriteTogglingId(systemId);
    await databaseService.toggleFavorite(currentUser.id, systemId);
    await loadData();
    setFavoriteTogglingId(null);
  };

  const accessibleSystems = isAdminOrManager 
    ? systems 
    : systems.filter((system) => hasAccess(system.id));

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

  // Lista exibida: sistemas já restritos por acesso (membros) ou todos (admin/manager), filtrados por busca e categoria
  const filteredSystems = systems.filter((system) => {
    const matchesSearch =
      system.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      system.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || system.category === selectedCategory;

    return matchesSearch && matchesCategory;
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
          <h1 className="text-3xl font-bold">Sistemas</h1>
          <p className="text-muted-foreground mt-2">
            {isAdmin 
              ? 'Gerencie sistemas, permissões e crie novos sistemas (apenas Admin)' 
              : isManager
              ? 'Gerencie permissões de acesso aos sistemas'
              : 'Acesse seus sistemas corporativos'}
          </p>
        </div>
        
        <div className="flex gap-2">
          {!isAdminOrManager && (
            <Button
              variant="outline"
              onClick={loadData}
              disabled={loading}
            >
              {loading ? <LoadingGif size="sm" className="mr-2 inline-block" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Atualizar
            </Button>
          )}
          
          {isAdmin && (
            <Dialog open={isAddSystemDialogOpen} onOpenChange={setIsAddSystemDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Sistema
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto p-6">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Sistema</DialogTitle>
                <DialogDescription>
                  Cadastre um novo sistema no GêApps
                </DialogDescription>
              </DialogHeader>
              {formError && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Sistema</label>
                <Input
                  placeholder="Ex: GêNovo"
                  value={newSystem.name}
                  onChange={(e) => setNewSystem({ ...newSystem, name: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <Input
                  placeholder="Breve descrição do sistema"
                  value={newSystem.description}
                  onChange={(e) => setNewSystem({ ...newSystem, description: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">URL</label>
                <Input
                  placeholder="https://genovo.gestack.com"
                  value={newSystem.url}
                  onChange={(e) => setNewSystem({ ...newSystem, url: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={newSystem.category}
                  onChange={(e) =>
                    setNewSystem({ ...newSystem, category: e.target.value as SystemCategory })
                  }
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ícone (opcional)</label>
                <Input
                  placeholder="/assets/systems/Nome.png ou deixe em branco"
                  value={newSystem.icon}
                  onChange={(e) => setNewSystem({ ...newSystem, icon: e.target.value })}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Caminho do ícone ou em branco para usar ícone pelo nome do sistema
                </p>
              </div>
              <Button className="w-full" onClick={handleAddSystem}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Sistema
              </Button>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </div>

      {/* Busca e filtro por categoria */}
      <div className="p-1 rounded-2xl bg-white/50 dark:bg-[#0d1520]/50 border border-slate-200 dark:border-white/5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-2 p-2">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar sistemas..."
              className="pl-11 h-12 bg-slate-100/50 dark:bg-black/20 border-slate-200 dark:border-white/5 focus-visible:ring-primary/30 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="lg" className="min-w-[200px] h-12 justify-between bg-slate-100/50 dark:bg-black/20 border-slate-200 dark:border-white/5 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-primary rounded-xl">
                <div className="flex items-center">
                  <Filter className="w-4 h-4 mr-2" />
                  {selectedCategory === 'all' ? 'Todas as categorias' : selectedCategory}
                </div>
                <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
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
        </div>
      </div>

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

                    {isAdminOrManager && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPermissionsDialog(system);
                        }}
                        title="Gerenciar permissões"
                      >
                        <Users className="w-4 h-4" />
                      </Button>
                    )}
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
                        Criado em {formatDate(selectedSystem.createdAt)}
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

      {/* Permissions Dialog */}
      <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Gerenciar Permissões - {selectedSystem?.name}</DialogTitle>
            <DialogDescription>
              Conceda ou revogue acesso ao sistema para usuários específicos
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {permissionLoading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingGif size="lg" />
              </div>
            ) : users.filter(user => user.id !== currentUser?.id).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário disponível
              </div>
            ) : (
              <div className="space-y-2">
                {users
                  .filter(user => user.id !== currentUser?.id) // Não mostrar o próprio usuário
                  .map((user) => {
                  const access = getUserAccess(user.id, selectedSystem?.id || '');
                  const hasPermission = access?.can_access || false;
                  const canModify = canModifyUserPermissions(user.role);
                  const isUserAdminOrManager = user.role === 'admin' || user.role === 'manager';

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{user.name}</p>
                            {user.role === 'manager' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 font-medium">
                                Gerente
                              </span>
                            )}
                            {user.role === 'admin' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-medium">
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>

                      {isUserAdminOrManager ? (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-green-500/10 text-green-600">
                          <Check className="w-4 h-4" />
                          Acesso Total
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            handleToggleAccess(user.id, selectedSystem?.id || '', hasPermission)
                          }
                          disabled={permissionLoading || !canModify}
                          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            !canModify
                              ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground'
                              : hasPermission
                              ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                          title={!canModify ? 'Você não tem permissão para modificar este usuário' : ''}
                        >
                          {hasPermission ? (
                            <>
                              <Check className="w-4 h-4" />
                              Permitido
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4" />
                              Bloqueado
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Remoção de Permissão</DialogTitle>
            <DialogDescription>
              Deseja realmente remover a permissão de acesso ao sistema <strong>{selectedSystem?.name}</strong> para o usuário <strong>{userToRevoke?.userName}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsRevokeDialogOpen(false);
                setUserToRevoke(null);
              }}
              disabled={permissionLoading}
            >
              Não
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRevokeAccess}
              disabled={permissionLoading}
            >
              {permissionLoading ? (
                <>
                  <LoadingGif size="sm" className="mr-2 inline-block" />
                  Removendo...
                </>
              ) : (
                'Sim, Remover'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
