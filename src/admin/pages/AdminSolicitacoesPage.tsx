import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, ExternalLink, Search, AlertCircle, Send, RefreshCw } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminPageHeader } from '@/admin/components/AdminPageHeader';
import { AdminControlLine, type ViewMode } from '@/admin/components/AdminControlLine';
import { AdminBigBox } from '@/admin/components/AdminBigBox';
import { databaseService, type RequestChannel, type RequestChannelType } from '@/services/supabase';
import { getDepartments, type NeonDepartment } from '@/services/corporateProfile';
import { LoadingGif, LoadingGifScreen } from '@/components/LoadingGif';
import { useAuthStore } from '@/store/authStore';

function renderIcon(iconPath: string, className: string = '') {
  const isImg =
    iconPath?.startsWith('http') ||
    iconPath?.startsWith('/') ||
    /\.(svg|png|jpg|jpeg)$/i.test(iconPath ?? '');
  if (isImg && iconPath) {
    return <img src={iconPath} alt="" className={className} />;
  }
  const IconComponent = (Icons as any)[iconPath] ?? Icons.Boxes;
  return <IconComponent className={className} />;
}

const TYPE_FILTER_ALL = 'all';
const TYPE_LABELS: Record<RequestChannelType, string> = {
  departamento: 'Departamento',
  setor: 'Setor',
};

function isAppsAdmin(accessType: string | undefined) {
  return String(accessType ?? '').toLowerCase().trim() === 'appsadmin';
}

export default function AdminSolicitacoesPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = isAppsAdmin(user?.accessType);

  const [channels, setChannels] = useState<RequestChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(TYPE_FILTER_ALL);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [departments, setDepartments] = useState<NeonDepartment[]>([]);
  const [depsLoading, setDepsLoading] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const selectedDept = departments.find((d) => d.id === selectedDeptId) ?? null;

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await databaseService.listRequestChannels();
    setChannels(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = channels.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.url ?? '').toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q);
    const matchType = typeFilter === TYPE_FILTER_ALL || c.channel_type === typeFilter;
    return matchSearch && matchType;
  });

  const resetForm = () => {
    setSelectedDeptId('');
    setFormUrl('');
    setFormError('');
  };

  const handleCreate = async () => {
    setFormError('');
    if (!selectedDept) {
      setFormError('Selecione um departamento.');
      return;
    }
    setFormLoading(true);
    const { data, error } = await databaseService.createRequestChannel({
      name: selectedDept.name,
      icon_url: selectedDept.icon ?? null,
      url: formUrl.trim() || null,
      channel_type: 'departamento',
      description: selectedDept.description ?? null,
      color: selectedDept.color ?? null,
    });
    setFormLoading(false);
    if (error) {
      const msg =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: string }).message)
          : 'Erro ao criar canal. Verifique se a tabela existe no Supabase.';
      setFormError(msg);
      return;
    }
    if (data) {
      setChannels((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      setIsCreateOpen(false);
      resetForm();
    }
  };

  const openCreate = async () => {
    resetForm();
    setIsCreateOpen(true);
    setDepsLoading(true);
    const deps = await getDepartments();
    setDepartments(deps);
    setDepsLoading(false);
  };

  const openChannelUrl = (c: RequestChannel) => {
    if (c.url) window.open(c.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Send}
        title="Solicitações"
        description="Envie solicitações para outros departamentos"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              title="Recarregar canais"
              className="h-9 rounded-xl"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>
            {canCreate && (
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Criar canal de solicitação
              </Button>
            )}
          </div>
        }
      />

      <AdminControlLine
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        leftContent={
          <div className="relative group/search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors duration-200" />
            <Input
              placeholder="Buscar departamentos ou setores"
              className="pl-8 w-56 sm:w-72 h-9 rounded-xl border-border/60 bg-muted/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        }
        rightContent={
          <select
            className="h-9 rounded-xl border border-border/60 bg-muted/50 px-3 py-1 text-sm font-medium shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background cursor-pointer"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filtrar por tipo de canal"
          >
            <option value={TYPE_FILTER_ALL}>Todos os canais</option>
            <option value="departamento">Departamentos</option>
            <option value="setor">Setores</option>
          </select>
        }
        showViewToggle
      />

      <AdminBigBox>
        {loading ? (
          <LoadingGifScreen className="h-64" />
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Send className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum canal encontrado.</p>
            {channels.length === 0 && (
              <p className="text-xs mt-2 max-w-md mx-auto">
                Quando a tabela for criada no Supabase, os canais aparecerão aqui. Appsadmins podem cadastrar novos
                canais.
              </p>
            )}
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((channel, index) => (
              <motion.div
                key={channel.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10" />
                <div
                  className="relative h-full flex flex-col justify-between p-5 rounded-2xl border border-white/5 bg-[#0d1520]/80 backdrop-blur-md transition-all duration-300 shadow-lg hover:border-primary/30 hover:bg-[#0d1520]/90 hover:shadow-primary/5 hover:-translate-y-2"
                  style={
                    channel.color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(channel.color)
                      ? { borderLeftWidth: 4, borderLeftColor: channel.color }
                      : undefined
                  }
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative group/icon shrink-0">
                        <div className="absolute inset-0 bg-primary/20 blur-lg rounded-xl opacity-0 group-hover/icon:opacity-50 transition-opacity duration-500" />
                        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-primary shadow-inner group-hover/icon:border-primary/30 transition-colors overflow-hidden">
                          {channel.icon ? (
                            renderIcon(channel.icon, 'w-7 h-7 object-contain drop-shadow')
                          ) : (
                            <Send className="w-7 h-7 opacity-60" />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-white tracking-tight truncate group-hover:text-primary transition-colors duration-300">
                          {channel.name}
                        </h3>
                        <span
                          className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            channel.channel_type === 'setor'
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                              : 'bg-primary/15 border-primary/30 text-primary'
                          }`}
                        >
                          {TYPE_LABELS[channel.channel_type]}
                        </span>
                        {channel.description ? (
                          <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">{channel.description}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/5 flex justify-end">
                    {channel.url ? (
                      <Button
                        size="sm"
                        className="h-8 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 shadow-none px-3"
                        onClick={() => openChannelUrl(channel)}
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Abrir
                      </Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50 italic">Sem URL</span>
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
                  <th className="text-left py-3 px-2 font-medium">Ícone</th>
                  <th className="text-left py-3 px-2 font-medium">Nome</th>
                  <th className="text-left py-3 px-2 font-medium">Descrição</th>
                  <th className="text-left py-3 px-2 font-medium">Tipo</th>
                  <th className="text-left py-3 px-2 font-medium">URL</th>
                  <th className="text-left py-3 px-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((channel) => (
                  <tr key={channel.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-2">
                      <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center overflow-hidden">
                        {channel.icon ? (
                          renderIcon(channel.icon, 'w-6 h-6 object-contain')
                        ) : (
                          <Send className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 font-medium">{channel.name}</td>
                    <td className="py-2 px-2 text-muted-foreground max-w-[200px] truncate" title={channel.description}>
                      {channel.description || '—'}
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          channel.channel_type === 'setor'
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                            : 'bg-primary/15 border-primary/30 text-primary'
                        }`}
                      >
                        {TYPE_LABELS[channel.channel_type]}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-muted-foreground max-w-[220px] truncate" title={channel.url}>
                      {channel.url || '—'}
                    </td>
                    <td className="py-2 px-2">
                      {channel.url ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => openChannelUrl(channel)}
                          title="Abrir"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminBigBox>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl">
          <div className="p-6 border-b border-border/40 bg-muted/20">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <DialogTitle className="text-xl font-semibold">Novo canal de solicitação</DialogTitle>
              </div>
              <DialogDescription className="text-sm">
                Selecione o departamento e informe a URL do formulário. Os demais campos são preenchidos automaticamente.
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
              {/* Dropdown de departamento */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Departamento <span className="text-destructive">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      setDepsLoading(true);
                      const deps = await getDepartments();
                      setDepartments(deps);
                      setDepsLoading(false);
                    }}
                    disabled={depsLoading}
                    title="Recarregar departamentos do GêTeams"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5', depsLoading && 'animate-spin')} />
                  </button>
                </div>
                {depsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <LoadingGif size="sm" />
                    Carregando departamentos…
                  </div>
                ) : (
                  <div className="relative">
                    <Icons.Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                    <select
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                      className="w-full h-10 rounded-xl border border-input bg-background/50 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="" disabled>Selecione um departamento...</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Preview dos dados puxados automaticamente */}
              {selectedDept && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Ícone</label>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
                        {selectedDept.icon ? (
                          renderIcon(selectedDept.icon, 'w-8 h-8 object-contain')
                        ) : (
                          <Icons.Image className="w-7 h-7 text-muted-foreground/40" />
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground font-mono">{selectedDept.icon || '—'}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Nome</label>
                    <div className="h-10 rounded-xl border border-border/50 bg-muted/30 px-3 flex items-center text-sm text-foreground">
                      {selectedDept.name}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Descrição</label>
                    <div className={cn(
                      'rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm min-h-[60px]',
                      !selectedDept.description && 'text-muted-foreground/50 italic'
                    )}>
                      {selectedDept.description || 'Sem descrição'}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Cor</label>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg border border-border shrink-0 shadow-inner"
                        style={{
                          backgroundColor:
                            selectedDept.color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(selectedDept.color)
                              ? selectedDept.color
                              : 'transparent',
                        }}
                        aria-hidden
                      />
                      <span className="text-sm text-muted-foreground font-mono">{selectedDept.color || '—'}</span>
                    </div>
                  </div>
                </>
              )}

              {/* URL do formulário — único campo manual */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">URL do formulário</label>
                <div className="relative">
                  <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <Input
                    placeholder="https://..."
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    className="pl-9 h-10 rounded-xl bg-background/50 focus-visible:ring-primary/20"
                  />
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
              Criar canal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
