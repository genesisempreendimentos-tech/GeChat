import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { SystemCategory } from '@/types';
import { LoadingGif, LoadingGifScreen } from '@/components/LoadingGif';

const categories: SystemCategory[] = [
  'RH',
  'Financeiro',
  'Marketing',
  'Arquitetura',
  'Ferramentas',
];

interface System {
  id: string;
  name: string;
  description: string;
  icon: string;
  url: string;
  category: SystemCategory;
  active: boolean;
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

export default function SystemsPage() {
  const { user: currentUser } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [systems, setSystems] = useState<System[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userAccesses, setUserAccesses] = useState<UserSystemAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [isAddSystemDialogOpen, setIsAddSystemDialogOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [userToRevoke, setUserToRevoke] = useState<{ userId: string; userName: string } | null>(null);
  const [permissionLoading, setPermissionLoading] = useState(false);
  
  const [newSystem, setNewSystem] = useState({
    name: '',
    description: '',
    icon: 'AppWindow',
    url: '',
    category: 'Ferramentas' as SystemCategory,
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

    const { data: systemsData } = await databaseService.getSystems();
    if (systemsData) {
      setSystems(systemsData as System[]);
    }

    const userIsAdminOrManager = currentUser.role === 'admin' || currentUser.role === 'manager';

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
        category: 'Ferramentas',
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

  // Lista exibida: todos os sistemas da tabela apps (banco), filtrados só por busca e categoria
  const systemsForList = systems;

  const filteredSystems = systemsForList.filter((system) => {
    const matchesSearch =
      system.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      system.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || system.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

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
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
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

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar sistemas..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2 overflow-x-auto">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                <Filter className="w-4 h-4 mr-2" />
                Todos
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

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
              >
                <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center text-primary p-2">
                          {renderIcon(system.icon, 'w-12 h-12 object-contain')}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{system.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {system.category}
                          </CardDescription>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(system.id);
                        }}
                        disabled={favoriteTogglingId === system.id}
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                        title={isFavorite(system.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      >
                        {favoriteTogglingId === system.id ? (
                          <LoadingGif size="sm" className="shrink-0" />
                        ) : (
                          <Star
                            className={`w-5 h-5 ${
                              isFavorite(system.id)
                                ? 'fill-yellow-500 text-yellow-500'
                                : 'text-muted-foreground hover:text-yellow-500'
                            }`}
                          />
                        )}
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p
                      className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[2.5rem]"
                      title={system.description}
                    >
                      {system.description.length > 80
                        ? `${system.description.slice(0, 80).trim()}...`
                        : system.description}
                    </p>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleSystemAccess(system.url, system.id)}
                      >
                        <ExternalLink className="w-3 h-3 mr-2" />
                        Acessar
                      </Button>

                      {isAdminOrManager && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPermissionsDialog(system)}
                        >
                          <Users className="w-3 h-3 mr-2" />
                          Permitir
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

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
