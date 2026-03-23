import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, ExternalLink, Search, AlertCircle, Send, RefreshCw } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const CHANNEL_FILTER_ALL = 'all';
const TYPE_LABELS: Record<RequestChannelType, string> = {
  departamento: 'Departamento',
  setor: 'Setor',
};

/** Apenas perfil `admin` em `profiles.access_type` pode criar canais de solicitação. */
function canCreateRequestChannels(accessType: string | undefined) {
  return String(accessType ?? '').toLowerCase().trim() === 'admin';
}

export default function AdminSolicitacoesPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = canCreateRequestChannels(user?.accessType);

  const [channels, setChannels] = useState<RequestChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilterId, setChannelFilterId] = useState<string>(CHANNEL_FILTER_ALL);

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

  useEffect(() => {
    if (
      channelFilterId !== CHANNEL_FILTER_ALL &&
      !channels.some((c) => c.id === channelFilterId)
    ) {
      setChannelFilterId(CHANNEL_FILTER_ALL);
    }
  }, [channels, channelFilterId]);

  const sortedChannels = useMemo(
    () => [...channels].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [channels]
  );

  const filtered = channels.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.url ?? '').toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q);
    const matchChannel =
      channelFilterId === CHANNEL_FILTER_ALL || c.id === channelFilterId;
    return matchSearch && matchChannel;
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
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar equipes
            </Button>
          ) : undefined
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
            className="h-9 max-w-[220px] sm:max-w-[280px] rounded-xl border border-border/60 bg-muted/50 px-3 py-1 text-sm font-medium shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background cursor-pointer truncate"
            value={channelFilterId}
            onChange={(e) => setChannelFilterId(e.target.value)}
            aria-label="Filtrar por departamento"
            title={
              channelFilterId === CHANNEL_FILTER_ALL
                ? 'Todos os departamentos'
                : channels.find((c) => c.id === channelFilterId)?.name
            }
          >
            <option value={CHANNEL_FILTER_ALL}>Todos os departamentos</option>
            {sortedChannels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
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
                Quando a tabela for criada no Supabase, os canais aparecerão aqui. Administradores podem{' '}
                <strong className="text-foreground">Adicionar equipes</strong> para vincular departamentos do GêTeams ao
                link do GêForms.
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
        <DialogContent className="sm:max-w-[520px] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl">
          <div className="relative overflow-hidden border-b border-border/40 px-6 pt-6 pb-5 shrink-0">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-violet-500/[0.06]"
              aria-hidden
            />
            <DialogHeader className="relative text-left space-y-3">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0 shadow-sm">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-1 pt-0.5 min-w-0">
                  <DialogTitle className="text-xl font-semibold tracking-tight">
                    Adicionar equipe ao canal de solicitações
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                    Selecione um departamento existente no Neon (GêTeams) e informe o link do formulário no GêForms. Nome,
                    ícone e descrição vêm do cadastro.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-3 text-sm text-destructive bg-destructive/[0.08] px-4 py-3 rounded-2xl border border-destructive/20"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="leading-snug">{formError}</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="dept-select-trigger"
                  className="text-sm font-semibold text-foreground flex items-center gap-2"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icons.Building2 className="w-3.5 h-3.5" />
                  </span>
                  Departamento
                  <span className="text-destructive font-bold">*</span>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    setDepsLoading(true);
                    const deps = await getDepartments();
                    setDepartments(deps);
                    setDepsLoading(false);
                  }}
                  disabled={depsLoading}
                  title="Recarregar departamentos do GêTeams"
                  className="h-8 px-2.5 rounded-lg text-xs text-muted-foreground hover:text-primary"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', depsLoading && 'animate-spin')} />
                  Atualizar lista
                </Button>
              </div>
              {depsLoading ? (
                <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                  <LoadingGif size="sm" />
                  Carregando departamentos do GêTeams…
                </div>
              ) : departments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/[0.06] px-4 py-4 text-sm text-muted-foreground">
                  Nenhum departamento retornado. Verifique a API e use <strong className="text-foreground">Atualizar lista</strong>.
                </div>
              ) : (
                <Select
                  value={selectedDeptId || undefined}
                  onValueChange={setSelectedDeptId}
                >
                  <SelectTrigger
                    id="dept-select-trigger"
                    className="h-12 rounded-2xl border-border/60 bg-gradient-to-b from-background to-muted/15 pl-4 pr-3 text-left shadow-sm hover:shadow-md hover:border-primary/30 transition-shadow"
                  >
                    <SelectValue placeholder="Selecione um departamento…" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-[280px]">
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="rounded-lg cursor-pointer">
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedDept && (
              <div className="rounded-2xl border border-border/50 bg-muted/[0.35] dark:bg-muted/20 p-5 space-y-4 shadow-inner">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pré-visualização (somente leitura)
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-background/80 border border-border/60 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                    {selectedDept.icon ? (
                      renderIcon(selectedDept.icon, 'w-9 h-9 object-contain')
                    ) : (
                      <Icons.Image className="w-8 h-8 text-muted-foreground/35" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-base font-semibold text-foreground truncate">{selectedDept.name}</p>
                    <p
                      className={cn(
                        'text-sm leading-relaxed line-clamp-2',
                        selectedDept.description ? 'text-muted-foreground' : 'text-muted-foreground/50 italic'
                      )}
                    >
                      {selectedDept.description || 'Sem descrição cadastrada'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/40">
                  <span className="text-xs text-muted-foreground shrink-0">Cor do departamento</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl border-2 border-background shadow-md ring-1 ring-border/50 shrink-0"
                      style={{
                        backgroundColor:
                          selectedDept.color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(selectedDept.color)
                            ? selectedDept.color
                            : 'hsl(var(--muted))',
                      }}
                      aria-hidden
                    />
                    <code className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                      {selectedDept.color || '—'}
                    </code>
                  </div>
                </div>
                {selectedDept.icon && (
                  <p className="text-[11px] font-mono text-muted-foreground/70 truncate" title={selectedDept.icon}>
                    {selectedDept.icon}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="form-url-input" className="text-sm font-semibold text-foreground">
                URL do formulário
              </label>
              <p className="text-xs text-muted-foreground -mt-1">
                Link externo do GêForms.
              </p>
              <div className="relative">
                <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none z-10" />
                <Input
                  id="form-url-input"
                  placeholder="https://…"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="pl-10 h-12 rounded-2xl border-border/60 bg-gradient-to-b from-background to-muted/10 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary/40"
                />
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-border/50 bg-muted/10 px-6 py-4 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-11 border-border/60"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancelar
            </Button>
            <Button className="flex-1 rounded-xl h-11 shadow-md shadow-primary/10" onClick={handleCreate} disabled={formLoading}>
              {formLoading ? <LoadingGif size="sm" className="mr-2" /> : <Plus className="w-4 h-4 mr-2 opacity-90" />}
              Criar canal de solicitação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
