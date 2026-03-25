import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shapes, LibraryBig, Plus, Search, MoreVertical, Pencil, Trash2, Archive, 
  AppWindow, LayoutDashboard, Users, Settings, Shield, FileText, 
  PieChart, Mail, Calendar, Camera, Music, Video, Map, 
  ShoppingBag, CreditCard, Globe, Cpu, Zap, Award, Book, 
  Briefcase, Cloud, Database, Inbox, AlertCircle
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MainViewHeader } from '@/components/layout/header';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { AdminControlLine, type ViewMode } from '@/admin/components/AdminControlLine';
import { AdminBigBox } from '@/admin/components/AdminBigBox';
import { databaseService } from '@/services/supabase';
import { LoadingGif, LoadingGifScreen } from '@/components/LoadingGif';
import { Category } from '@/types';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS = [
  'Shapes', 'AppWindow', 'LayoutDashboard', 'Users', 'Settings', 
  'Shield', 'FileText', 'PieChart', 'Mail', 'Calendar', 
  'Camera', 'Music', 'Video', 'Map', 'ShoppingBag', 
  'CreditCard', 'Globe', 'Cpu', 'Zap', 'Award', 
  'Book', 'Briefcase', 'Cloud', 'Database', 'Inbox'
];

const CATEGORY_COLORS = [
  'bg-slate-500', 'bg-gray-500', 'bg-zinc-500', 'bg-neutral-500', 'bg-stone-500',
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500',
  'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
  'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500'
];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    icon: 'Shapes',
    color: 'bg-primary-500'
  });

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await databaseService.getCategories();
    if (error) {
      console.error(error);
    } else {
      setCategories((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCategories = categories.filter(c => 
    !searchQuery || 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setForm({
        name: category.name,
        description: category.description || '',
        icon: category.icon || 'Shapes',
        color: category.color || 'bg-slate-500'
      });
    } else {
      setEditingCategory(null);
      setForm({
        name: '',
        description: '',
        icon: 'Shapes',
        color: 'bg-slate-500'
      });
    }
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('O nome é obrigatório.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    const categoryData = {
      name: form.name.trim(),
      description: form.description.trim(),
      icon: form.icon,
      color: form.color,
      status: 'ativo' as const
    };

    let result;
    if (editingCategory) {
      result = await databaseService.updateCategory(editingCategory.id, categoryData);
    } else {
      result = await databaseService.createCategory(categoryData);
    }

    setFormLoading(false);
    if (result.error) {
      setFormError('Erro ao salvar categoria. Verifique o console.');
      console.error(result.error);
    } else {
      setIsModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      const { error } = await databaseService.deleteCategory(id);
      if (error) {
        console.error(error);
        alert('Erro ao excluir categoria.');
      } else {
        loadData();
      }
    }
  };

  const handleArchive = async (category: Category) => {
    const newStatus = category.status === 'arquivado' ? 'ativo' : 'arquivado';
    const { error } = await databaseService.updateCategory(category.id, { status: newStatus });
    if (error) {
      console.error(error);
      alert('Erro ao alterar status da categoria.');
    } else {
      loadData();
    }
  };

  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = (LucideIcons as any)[iconName] || Shapes;
    return <IconComponent className={className} />;
  };

  return (
    <MainViewFluidShell>
    <div className="space-y-6">
      <MainViewHeader
        icon={<LibraryBig className="h-6 w-6" />}
        title="Categorias"
        description="Gerencie as categorias dos aplicativos."
        button={
          <Button
            onClick={() => handleOpenModal()}
            className="h-10 rounded-xl px-4 font-semibold shadow-sm shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova categoria
          </Button>
        }
      />

      <AdminControlLine
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        leftContent={
          <div className="relative group/search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors duration-200" />
            <Input
              placeholder="Buscar categorias..."
              className="pl-8 w-64 h-9 rounded-xl border-border/60 bg-muted/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50 text-sm"
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
        ) : filteredCategories.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Shapes className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma categoria encontrada.</p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCategories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="h-full hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className={cn("absolute top-0 left-0 w-full h-1", category.color)} />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white", category.color)}>
                          {renderIcon(category.icon || 'Shapes', 'w-6 h-6')}
                        </div>
                        <div>
                          <CardTitle className="text-base">{category.name}</CardTitle>
                          {category.status === 'arquivado' && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase font-bold">Arquivado</span>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenModal(category)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(category)}>
                            <Archive className="w-4 h-4 mr-2" />
                            {category.status === 'arquivado' ? 'Desarquivar' : 'Arquivar'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(category.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {category.description || 'Sem descrição.'}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium">Ícone</th>
                  <th className="text-left py-3 px-4 font-medium">Nome</th>
                  <th className="text-left py-3 px-4 font-medium">Descrição</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-right py-3 px-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((category) => (
                  <tr key={category.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-4">
                      <div className={cn("w-8 h-8 rounded flex items-center justify-center text-white", category.color)}>
                        {renderIcon(category.icon || 'Shapes', 'w-5 h-5')}
                      </div>
                    </td>
                    <td className="py-2 px-4 font-medium">{category.name}</td>
                    <td className="py-2 px-4 text-muted-foreground max-w-[300px] truncate">
                      {category.description || '—'}
                    </td>
                    <td className="py-2 px-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        category.status === 'arquivado' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {category.status || 'ativo'}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenModal(category)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(category)}>
                            <Archive className="w-4 h-4 mr-2" />
                            {category.status === 'arquivado' ? 'Desarquivar' : 'Arquivar'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(category.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminBigBox>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
            <DialogDescription>
              Preencha os dados da categoria abaixo.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nome</label>
              <Input
                placeholder="Ex: Recursos Humanos"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Descrição</label>
              <Input
                placeholder="Breve descrição dos apps desta categoria"
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Ícone</label>
              <div className="grid grid-cols-5 gap-2 border rounded-lg p-2 bg-muted/30">
                {CATEGORY_ICONS.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, icon: iconName }))}
                    className={cn(
                      "flex items-center justify-center p-2 rounded-md transition-all",
                      form.icon === iconName 
                        ? "bg-primary text-primary-foreground shadow-sm scale-110" 
                        : "bg-background hover:bg-accent text-muted-foreground"
                    )}
                  >
                    {renderIcon(iconName, "w-5 h-5")}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Cor</label>
              <div className="grid grid-cols-5 gap-2 border rounded-lg p-2 bg-muted/30">
                {CATEGORY_COLORS.map((colorClass) => (
                  <button
                    key={colorClass}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: colorClass }))}
                    className={cn(
                      "w-full aspect-square rounded-md transition-all flex items-center justify-center",
                      colorClass,
                      form.color === colorClass && "ring-2 ring-offset-2 ring-primary scale-110"
                    )}
                  >
                    {form.color === colorClass && <div className="w-2 h-2 rounded-full bg-white shadow-sm" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button className="flex-1" onClick={handleSave} disabled={formLoading}>
              {formLoading && <LoadingGif size="sm" className="mr-2" />}
              {editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
            </Button>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </MainViewFluidShell>
  );
}
