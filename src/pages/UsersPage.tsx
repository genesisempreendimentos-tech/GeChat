import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { databaseService, authService } from '@/services/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Users as UsersIcon,
  UserPlus,
  Shield,
  Search,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { LoadingGif, LoadingGifScreen } from '@/components/LoadingGif';
import { User } from '@/types';

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'manager' | 'user',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Carregar usuários do Supabase
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await databaseService.getUsers();
    if (data) {
      const mappedUsers: User[] = data.map((user: any) => ({
        id: user.id,
        name: user.name || 'Sem nome',
        email: user.email || '',
        role: user.role as 'admin' | 'manager' | 'user',
        avatar: user.avatar,
        createdAt: new Date(user.created_at),
      }));
      setUsers(mappedUsers);
    } else if (error) {
      console.error('Erro ao carregar usuários:', error);
    }
    setLoading(false);
  };

  const handleAddUser = async () => {
    setFormError('');
    setFormLoading(true);

    // Validações
    if (!formData.name || !formData.email || !formData.password) {
      setFormError('Todos os campos são obrigatórios');
      setFormLoading(false);
      return;
    }

    if (!formData.email.endsWith('@genesisempreendimentos.com.br')) {
      setFormError('Email deve ser do domínio @genesisempreendimentos.com.br');
      setFormLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setFormError('A senha deve ter no mínimo 6 caracteres');
      setFormLoading(false);
      return;
    }

    try {
      const { data: existingUser, error: checkError } = await databaseService.getUserByEmail(formData.email);

      if (checkError) {
        setFormError('Erro ao validar email. Tente novamente.');
        setFormLoading(false);
        return;
      }

      if (existingUser) {
        setFormError('Este email já está cadastrado no sistema');
        setFormLoading(false);
        return;
      }

      // Criar usuário no Supabase Auth
      const { error } = await authService.signUp(
        formData.email,
        formData.password,
        formData.name,
        formData.role
      );

      if (error) {
        const errorMessage = (error as any).message || '';
        
        // Tratar erros específicos
        if (errorMessage.includes('already registered') || errorMessage.includes('User already registered')) {
          setFormError('Este email já está cadastrado no sistema');
        } else if (errorMessage.includes('Invalid email')) {
          setFormError('Email inválido');
        } else if (errorMessage.includes('Password')) {
          setFormError('Senha inválida ou muito fraca');
        } else {
          setFormError(errorMessage || 'Erro ao criar usuário');
        }
        
        setFormLoading(false);
        return;
      }

      // Recarregar lista de usuários
      await loadUsers();

      // Limpar formulário e fechar dialog
      setFormData({ name: '', email: '', password: '', role: 'user' });
      setIsAddDialogOpen(false);
      setFormLoading(false);
    } catch (err: any) {
      const errorMessage = err.message || '';
      
      if (errorMessage.includes('already registered') || errorMessage.includes('User already registered')) {
        setFormError('Este email já está cadastrado no sistema');
      } else {
        setFormError(errorMessage || 'Erro ao criar usuário');
      }
      
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setFormLoading(true);

    try {
      const { error } = await databaseService.deleteUser(selectedUser.id);

      if (error) {
        alert('Erro ao excluir usuário: ' + error.message);
      } else {
        await loadUsers();
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
      }
    } catch (err: any) {
      alert('Erro ao excluir usuário: ' + (err as Error).message);
    }

    setFormLoading(false);
  };

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground">
              Apenas administradores podem acessar esta página
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredUsers = users.filter((user) =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/10 text-red-500';
      case 'manager':
        return 'bg-blue-500/10 text-blue-500';
      default:
        return 'bg-green-500/10 text-green-500';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'manager':
        return 'Gerente';
      default:
        return 'Usuário';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <UsersIcon className="w-8 h-8" />
            Usuários
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie usuários e suas permissões de acesso
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md p-5 sm:p-5">
            <DialogHeader className="space-y-1 pb-2">
              <DialogTitle className="text-lg">Adicionar Novo Usuário</DialogTitle>
              <DialogDescription className="text-sm">
                Crie um novo usuário e defina suas permissões
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-1">
              {formError && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-2.5 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome Completo</label>
                <Input
                  placeholder="Nome completo"
                  className="h-9"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="email@genesisempreendimentos.com.br"
                  className="h-9"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Senha</label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  className="h-9"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Função</label>
                <select
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as 'admin' | 'manager' | 'user' })
                  }
                >
                  <option value="user">Usuário</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <Button className="w-full h-9 mt-1" size="sm" onClick={handleAddUser} disabled={formLoading}>
                {formLoading ? (
                  <>
                    <LoadingGif size="sm" className="mr-2 inline-block" />
                    Criando...
                  </>
                ) : (
                  'Criar Usuário'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Busca */}
      <div className="relative max-w-md group/search">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors duration-200" />
        <Input
          placeholder="Buscar usuários..."
          className="pl-9 h-10 rounded-xl border-border/60 bg-muted/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50 text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Lista de usuários (linhas, sem blocos) */}
      {loading ? (
        <LoadingGifScreen className="h-64" />
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/50 py-16 text-center">
          <UsersIcon className="w-14 h-14 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold mb-1">Nenhum usuário encontrado</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? 'Tente buscar com outros termos' : 'Adicione seu primeiro usuário'}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
            <div className="divide-y divide-border">
              {filteredUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-semibold overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      <span>{user.name?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">{user.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <span
                    className={`shrink-0 text-xs px-2.5 py-1 rounded-md font-medium ${getRoleBadgeColor(
                      user.role
                    )}`}
                  >
                    {getRoleLabel(user.role)}
                  </span>
                  <span className="hidden sm:inline shrink-0 text-sm text-muted-foreground">
                    {user.createdAt
                      ? user.createdAt.toLocaleDateString('pt-BR')
                      : '—'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setSelectedUser(user);
                      setIsDeleteDialogOpen(true);
                    }}
                    disabled={user.id === currentUser?.id}
                  >
                    <Trash2 className="w-4 h-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Excluir</span>
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              Total: <strong className="text-foreground">{filteredUsers.length}</strong>{' '}
              {filteredUsers.length === 1 ? 'usuário' : 'usuários'}
            </span>
            <div className="flex gap-4">
              <span>
                Admins: <strong className="text-foreground">{users.filter((u) => u.role === 'admin').length}</strong>
              </span>
              <span>
                Gerentes: <strong className="text-foreground">{users.filter((u) => u.role === 'manager').length}</strong>
              </span>
              <span>
                Usuários: <strong className="text-foreground">{users.filter((u) => u.role === 'user').length}</strong>
              </span>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{selectedUser?.name}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedUser(null);
              }}
              disabled={formLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={formLoading}
            >
              {formLoading ? (
                <>
                  <LoadingGif size="sm" className="mr-2 inline-block" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Usuário
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
