import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  ExternalLink,
  Search,
  AlertCircle,
  Upload,
  Send,
  Image as ImageIcon,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  databaseService,
  storageService,
  type RequestChannel,
  type RequestChannelType,
} from '@/services/supabase';
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
  const [form, setForm] = useState<{
    name: string;
    logo: string;
    url: string;
    channel_type: RequestChannelType;
  }>({
    name: '',
    logo: '',
    url: '',
    channel_type: 'departamento',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const createLogoInputRef = useRef<HTMLInputElement>(null);

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
      (c.url ?? '').toLowerCase().includes(q);
    const matchType = typeFilter === TYPE_FILTER_ALL || c.channel_type === typeFilter;
    return matchSearch && matchType;
  });

  const resetForm = () => {
    setForm({
      name: '',
      logo: '',
      url: '',
      channel_type: 'departamento',
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
    const { data, error } = await databaseService.createRequestChannel({
      name: form.name.trim(),
      icon_url: form.logo.trim() || null,
      url: form.url.trim() || null,
      channel_type: form.channel_type,
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

  const handleLogoUpload = useCallback(async (file: File, setLogo: (url: string) => void) => {
    setLogoUploading(true);
    setFormError('');
    const { url, error } = await storageService.uploadRequestChannelIcon(file);
    setLogoUploading(false);
    if (error || !url) {
      setFormError('Falha no upload da imagem. Verifique o bucket GeImage no Supabase.');
      return;
    }
    setLogo(url);
  }, []);

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openChannelUrl = (c: RequestChannel) => {
    if (c.url) window.open(c.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Send}
        title="Solicitações"
        description="Envie solicitações para outros departamentos ou setores"
        action={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Criar canal de solicitação
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
                <div className="relative h-full flex flex-col justify-between p-5 rounded-2xl border border-white/5 bg-[#0d1520]/80 backdrop-blur-md transition-all duration-300 shadow-lg hover:border-primary/30 hover:bg-[#0d1520]/90 hover:shadow-primary/5 hover:-translate-y-2">
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
                Preencha os dados do canal. Ele ficará visível para todos os membros após salvar.
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
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Nome <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Ex.: RH — Solicitações"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-10 rounded-xl bg-background/50 focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Ícone</label>
                <div className="flex items-start gap-4 mt-1">
                  <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
                    {form.logo ? (
                      form.logo.startsWith('http') ? (
                        <img src={form.logo} alt="" className="w-10 h-10 object-contain drop-shadow" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                      )
                    ) : (
                      <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
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
                      className="w-full h-10 rounded-xl border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
                      disabled={logoUploading}
                      onClick={() => createLogoInputRef.current?.click()}
                    >
                      {logoUploading ? (
                        <LoadingGif size="sm" className="w-4 h-4 mr-2" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2 text-muted-foreground" />
                      )}
                      <span className="font-normal text-muted-foreground">
                        {logoUploading ? 'Enviando...' : 'Clique para enviar imagem'}
                      </span>
                    </Button>
                    <p className="text-[11px] text-muted-foreground/70">Recomendado: 512x512px, PNG ou SVG.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">URL de acesso</label>
                <div className="relative">
                  <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <Input
                    placeholder="https://..."
                    value={form.url}
                    onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                    className="pl-9 h-10 rounded-xl bg-background/50 focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Tipo</label>
                <div className="relative">
                  <Send className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                  <select
                    className="w-full h-10 rounded-xl border border-input bg-background/50 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 appearance-none"
                    value={form.channel_type}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        channel_type: e.target.value as RequestChannelType,
                      }))
                    }
                  >
                    <option value="departamento">Departamento</option>
                    <option value="setor">Setor</option>
                  </select>
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
