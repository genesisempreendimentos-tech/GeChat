import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, ExternalLink, Search, AlertCircle, MoreVertical, Pencil, Unlock, Trash2, UserPlus, Upload, Zap, Boxes } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarGroup, AvatarGroupTooltip } from '@/components/ui/avatar-group';
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
import { AdminPageHeader } from '@/admin/components/AdminPageHeader';
import { AdminControlLine, type ViewMode } from '@/admin/components/AdminControlLine';
import { AdminBigBox } from '@/admin/components/AdminBigBox';
import { databaseService, storageService } from '@/services/supabase';
import { LoadingGif, LoadingGifScreen } from '@/components/LoadingGif';
import { SystemCategory, Category } from '@/types';
import { Badge } from '@/components/ui/badge';
import { ComingSoonModal } from '@/components/ComingSoonModal';

// O array CATEGORIES original agora é carregado do banco
const STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'beta', label: 'Beta' },
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'arquivado', label: 'Arquivado' },
  { value: 'excluído', label: 'Excluído' },
] as const;

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
  const [systems, setSystems] = useState<AdminSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [comingSoonSystem, setComingSoonSystem] = useState<AdminSystem | null>(null);

  const handleOpenSystem = (system: AdminSystem) => {
    if (system.status === 'beta' || system.status === 'rascunho') {
      setComingSoonSystem(system);
      return;
    }
    if (system.url) window.open(system.url, '_blank');
  };

  type FormStatus = 'ativo' | 'beta' | 'rascunho' | 'arquivado';
  const [form, setForm] = useState<{
    name: string;
    logo: string;
    description: string;
    category: string;
    status: FormStatus;
    url: string;
  }>({
    name: '',
    logo: '',
    description: '',
    category: '',
    status: 'rascunho',
    url: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [appUsers, setAppUsers] = useState<Record<string, { id: string; name: string; avatar?: string }[]>>({});
  const [editingSystem, setEditingSystem] = useState<AdminSystem | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', logo: '', category: '' as SystemCategory, url: '', status: 'rascunho' as string });
  const [liberarAppId, setLiberarAppId] = useState<string | null>(null);
  const [searchCollaborators, setSearchCollaborators] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; email: string; avatar?: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const createLogoInputRef = useRef<HTMLInputElement>(null);
  const editLogoInputRef = useRef<HTMLInputElement>(null);

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

  const filtered = systems.filter((s) => {
    const matchSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === 'all' || s.category === selectedCategory;
    const matchStatus = selectedStatus === 'all' || (s.status ?? '') === selectedStatus;
    return matchSearch && matchCat && matchStatus;
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

  const handleGrantAccess = async (appId: string, userId: string) => {
    await databaseService.setUserSystemAccess(userId, appId, true);
    const { data } = await databaseService.getUsersWithAccessToApp(appId);
    setAppUsers((prev) => ({ ...prev, [appId]: data ?? [] }));
  };

  const handleRevokeAccess = async (appId: string, userId: string) => {
    await databaseService.setUserSystemAccess(userId, appId, false);
    const { data } = await databaseService.getUsersWithAccessToApp(appId);
    setAppUsers((prev) => ({ ...prev, [appId]: data ?? [] }));
  };

  const searchCollaboratorsDebounced = useCallback(() => {
    const q = searchCollaborators.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    databaseService.searchProfiles(q).then(({ data }) => {
      setSearchResults(data ?? []);
      setSearching(false);
    });
  }, [searchCollaborators]);

  useEffect(() => {
    const t = setTimeout(searchCollaboratorsDebounced, 300);
    return () => clearTimeout(t);
  }, [searchCollaborators, searchCollaboratorsDebounced]);

  const openEditModal = (system: AdminSystem) => {
    setEditingSystem(system);
    setEditForm({
      name: system.name,
      description: system.description ?? '',
      logo: typeof system.icon === 'string' && (system.icon.startsWith('http') || system.icon.startsWith('/')) ? system.icon : '',
      category: (system.category as SystemCategory) ?? 'Ferramentas',
      url: system.url ?? '',
      status: system.status ?? 'rascunho',
    });
    setFormError('');
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
    });
    setFormLoading(false);
    if (error) {
      setFormError((error as any).message ?? 'Erro ao criar sistema.');
      return;
    }
    if (data) {
      setSystems((prev) => [...prev, data as AdminSystem].sort((a, b) => a.name.localeCompare(b.name)));
      setIsCreateOpen(false);
      setForm({ name: '', logo: '', description: '', category: categories[0]?.name || '', status: 'rascunho', url: '' });
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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Boxes}
        title="Apps"
        description="Gerencie os sistemas (apps) disponíveis no GêApps."
        action={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar sistema
          </Button>
        }
      />

      <AdminControlLine
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        leftContent={
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="pl-8 w-40 h-9 rounded-xl border-border/70 bg-card/50 backdrop-blur-sm shadow-sm transition-colors hover:bg-accent/50 focus-visible:ring-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="h-9 rounded-xl border border-border/70 bg-card/50 backdrop-blur-sm px-3 py-1 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">Todos os status</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              className="h-9 rounded-xl border border-border/70 bg-card/50 backdrop-blur-sm px-3 py-1 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Todas categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </>
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
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10" />
                
                <div className="relative h-full flex flex-col justify-between p-5 rounded-2xl border border-white/5 bg-[#0d1520]/80 backdrop-blur-md hover:border-primary/30 hover:bg-[#0d1520]/90 transition-all duration-300 shadow-lg hover:shadow-primary/5 hover:-translate-y-2">
                  
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
                      <Badge variant={system.status === 'ativo' ? 'default' : 'secondary'} className="text-[10px] uppercase tracking-wide px-2 h-6">
                        {system.status ?? 'rascunho'}
                      </Badge>
                      
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
                          <DropdownMenuItem onClick={() => { setLiberarAppId(system.id); setSearchCollaborators(''); setSearchResults([]); }}>
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

                  {/* Footer: AvatarStack + Abrir */}
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0 flex items-center">
                      {(appUsers[system.id]?.length ?? 0) > 0 ? (
                        <>
                          <AvatarGroup className="-space-x-3">
                            {(appUsers[system.id] || []).slice(0, 4).map((user, i) => (
                              <Avatar key={user.id || i} className="w-[26px] h-[26px] border-2 border-background">
                                <AvatarImage src={user.avatar} className="object-cover" />
                                <AvatarFallback className="text-[10px]">{(user.name || '?').charAt(0).toUpperCase()}</AvatarFallback>
                                <AvatarGroupTooltip>{user.name || 'Colaborador'}</AvatarGroupTooltip>
                              </Avatar>
                            ))}
                            {(appUsers[system.id]?.length || 0) > 4 && (
                              <Avatar className="w-[26px] h-[26px] border-2 border-background hover:z-10">
                                <AvatarFallback className="text-[9px] bg-muted text-muted-foreground font-medium">
                                  +{(appUsers[system.id]?.length || 0) - 4}
                                </AvatarFallback>
                                <AvatarGroupTooltip>+{(appUsers[system.id]?.length || 0) - 4} colaboradores</AvatarGroupTooltip>
                              </Avatar>
                            )}
                          </AvatarGroup>
                          <span className="ml-2 text-[10px] text-muted-foreground hidden xl:inline-block">
                            {appUsers[system.id].length}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/50 italic">Sem acessos</span>
                      )}
                    </div>

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
                      <Badge variant="secondary" className="capitalize text-xs">
                        {system.status ?? 'rascunho'}
                      </Badge>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        {system.url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() => handleOpenSystem(system)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
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
                            <DropdownMenuItem onClick={() => { setLiberarAppId(system.id); setSearchCollaborators(''); setSearchResults([]); }}>
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

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar sistema</DialogTitle>
            <DialogDescription>
              Preencha os campos. O sistema aparecerá no painel após ser criado.
            </DialogDescription>
          </DialogHeader>
          {formError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input
                placeholder="Ex: GêNovo"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Logo (apenas upload)</label>
              <div className="mt-1 flex items-center gap-2">
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
                  disabled={logoUploading}
                  onClick={() => createLogoInputRef.current?.click()}
                >
                  {logoUploading ? <LoadingGif size="sm" className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  Enviar imagem
                </Button>
                {form.logo && (
                  <div className="flex items-center gap-2">
                    {form.logo.startsWith('http') ? (
                      <img src={form.logo} alt="Logo" className="w-10 h-10 rounded object-contain border border-border" />
                    ) : null}
                    <span className="text-xs text-muted-foreground truncate max-w-[180px]" title={form.logo}>
                      Imagem selecionada
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input
                placeholder="Breve descrição do aplicativo"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">URL (opcional)</label>
              <Input
                placeholder="https://..."
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <select
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="" disabled>Selecione uma categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as 'ativo' | 'beta' | 'rascunho' | 'arquivado' }))
                }
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleCreate} disabled={formLoading}>
              {formLoading ? <LoadingGif size="sm" className="mr-2" /> : null}
              Criar sistema
            </Button>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={!!editingSystem} onOpenChange={(open) => !open && setEditingSystem(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar app</DialogTitle>
            <DialogDescription>
              Altere nome, descrição, logo, categoria e demais informações.
            </DialogDescription>
          </DialogHeader>
          {editingSystem && (
            <>
              {formError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Nome</label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Input
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Logo (apenas upload)</label>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
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
                      disabled={logoUploading}
                      onClick={() => editLogoInputRef.current?.click()}
                    >
                      {logoUploading ? <LoadingGif size="sm" className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                      {editForm.logo ? 'Substituir imagem' : 'Enviar imagem'}
                    </Button>
                    {editForm.logo && (
                      <div className="flex items-center gap-2">
                        {(editForm.logo.startsWith('http') || editForm.logo.startsWith('/')) ? (
                          <img src={editForm.logo} alt="Logo" className="w-10 h-10 rounded object-contain border border-border" />
                        ) : null}
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]" title={editForm.logo}>
                          Imagem atual
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">URL</label>
                  <Input
                    value={editForm.url}
                    onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Categoria</label>
                  <select
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={editForm.category}
                    onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    <option value="" disabled>Selecione uma categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <select
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={handleUpdateSystem} disabled={formLoading}>
                  {formLoading ? <LoadingGif size="sm" className="mr-2" /> : null}
                  Salvar
                </Button>
                <Button variant="outline" onClick={() => setEditingSystem(null)}>
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Liberar acesso */}
      <Dialog open={!!liberarAppId} onOpenChange={(open) => !open && setLiberarAppId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Liberar acesso ao app</DialogTitle>
            <DialogDescription>
              Colaboradores com acesso liberado veem este app no ambiente de membros. Busque e adicione ou remova acessos.
            </DialogDescription>
          </DialogHeader>
          {liberarAppId && (
            <div className="space-y-4 flex-1 min-h-0 flex flex-col">
              <div>
                <label className="text-sm font-medium">Buscar colaborador (nome ou e-mail)</label>
                <Input
                  placeholder="Digite ao menos 2 caracteres..."
                  value={searchCollaborators}
                  onChange={(e) => setSearchCollaborators(e.target.value)}
                  className="mt-1"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="border rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                  <p className="text-xs text-muted-foreground mb-2">Resultados — clique para liberar acesso</p>
                  {searchResults.map((u) => {
                    const hasAccess = (appUsers[liberarAppId] ?? []).some((a) => a.id === u.id);
                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-2 py-2 px-2 rounded hover:bg-muted/50"
                      >
                        <span className="text-sm truncate">{u.name || u.email}</span>
                        {hasAccess ? (
                          <Badge variant="secondary">Com acesso</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7"
                            onClick={() => handleGrantAccess(liberarAppId, u.id)}
                          >
                            <UserPlus className="w-3 h-3 mr-1" />
                            Liberar
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {searching && <p className="text-sm text-muted-foreground">Buscando...</p>}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Colaboradores com acesso</p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {(appUsers[liberarAppId] ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum colaborador com acesso liberado.</p>
                  ) : (
                    (appUsers[liberarAppId] ?? []).map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-2 py-2 px-2 rounded bg-muted/30"
                      >
                        <span className="text-sm truncate">{u.name || u.id}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-destructive hover:text-destructive"
                          onClick={() => handleRevokeAccess(liberarAppId, u.id)}
                        >
                          Remover
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setLiberarAppId(null)}>
                Fechar
              </Button>
            </div>
          )}
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
      />
    </div>
  );
}
