import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Send, Headset, ExternalLink, Filter, ChevronDown, Boxes } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AdminControlLine } from '@/admin/components/AdminControlLine';
import type { ViewMode } from '@/admin/components/AdminControlLine';
import {
  databaseService,
  type RequestChannel,
  type RequestChannelType,
} from '@/services/supabase';
import { LoadingGifScreen } from '@/components/LoadingGif';
import { cn } from '@/lib/utils';

const NAME_FILTER_ALL = 'all';
const TYPE_LABELS: Record<RequestChannelType, string> = {
  departamento: 'Departamento',
  setor: 'Setor',
};

type SolicitacoesMainTab = 'canais' | 'enviados';

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

export default function SolicitacoesPage() {
  const [channels, setChannels] = useState<RequestChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [nameFilter, setNameFilter] = useState<string>(NAME_FILTER_ALL);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [mainTab, setMainTab] = useState<SolicitacoesMainTab>('canais');

  /**
   * Um item por nome distinto de canal; `icon` vem do BD (`icon_url`), alinhado ao ícone do departamento no GêTeams.
   */
  const channelFilterOptions = useMemo(() => {
    const byName = new Map<string, string>();
    for (const c of channels) {
      const n = (c.name ?? '').trim();
      if (!n || byName.has(n)) continue;
      byName.set(n, (c.icon ?? '').trim());
    }
    return [...byName.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
      .map(([name, icon]) => ({ name, icon }));
  }, [channels]);

  const filterDropdownLabel =
    nameFilter === NAME_FILTER_ALL ? 'Todos os canais' : nameFilter;

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
    if (nameFilter !== NAME_FILTER_ALL && !channelFilterOptions.some((o) => o.name === nameFilter)) {
      setNameFilter(NAME_FILTER_ALL);
    }
  }, [channelFilterOptions, nameFilter]);

  const filtered = channels.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.url ?? '').toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q);
    const matchName = nameFilter === NAME_FILTER_ALL || c.name === nameFilter;
    return matchSearch && matchName;
  });

  const openChannel = (c: RequestChannel) => {
    if (c.url) window.open(c.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Headset className="w-8 h-8 shrink-0" />
          Solicitações
        </h1>
        <p className="text-muted-foreground mt-2">
          Envie solicitações para outros departamentos
        </p>
      </div>

      <AdminControlLine
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showViewToggle
        leftContent={
          <div className="flex rounded-xl border border-border/60 p-1 bg-muted/30 shadow-sm transition-colors hover:border-border/80">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 rounded-lg text-sm font-medium transition-all duration-300 px-3 gap-2',
                mainTab === 'canais'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
              onClick={() => setMainTab('canais')}
              aria-pressed={mainTab === 'canais'}
            >
              <Headset className="h-4 w-4 shrink-0" aria-hidden />
              Canais
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 rounded-lg text-sm font-medium transition-all duration-300 px-3 gap-2',
                mainTab === 'enviados'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
              onClick={() => setMainTab('enviados')}
              aria-pressed={mainTab === 'enviados'}
            >
              <Send className="h-4 w-4 shrink-0" aria-hidden />
              Enviados
            </Button>
          </div>
        }
        centerContent={
          <div className="relative group/search w-full max-w-3xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors duration-200" />
            <Input
              placeholder="Buscar canais..."
              className="pl-8 h-9 rounded-xl border-border/60 bg-muted/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50 text-sm w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        }
        rightContent={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-9 min-w-[220px] justify-between rounded-xl border-border/60 bg-muted/50 px-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40"
              >
                <div className="flex items-center min-w-0">
                  <Filter className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{filterDropdownLabel}</span>
                </div>
                <ChevronDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[280px] max-w-[360px] max-h-[280px] overflow-y-auto bg-white dark:bg-[#0d1520] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
            >
              <DropdownMenuItem
                onClick={() => setNameFilter(NAME_FILTER_ALL)}
                className="focus:bg-primary/20 focus:text-primary cursor-pointer"
              >
                Todos os canais
              </DropdownMenuItem>
              {channelFilterOptions.length === 0 ? (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  Nenhum departamento cadastrado ainda
                </div>
              ) : (
                channelFilterOptions.map(({ name, icon }) => (
                  <DropdownMenuItem
                    key={name}
                    onClick={() => setNameFilter(name)}
                    className="focus:bg-primary/20 focus:text-primary cursor-pointer"
                  >
                    <span className="flex min-w-0 w-full items-center gap-2">
                      {icon ? (
                        renderIcon(icon, 'h-4 w-4 shrink-0 object-contain')
                      ) : (
                        <Boxes className="h-4 w-4 shrink-0 text-muted-foreground opacity-70" />
                      )}
                      <span className="truncate">{name}</span>
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {mainTab === 'enviados' ? (
        <p className="py-16 text-center text-muted-foreground">Tela em desenvolvimento</p>
      ) : loading ? (
        <LoadingGifScreen className="h-64" />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Send className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2">Nenhum canal encontrado</h3>
            <p className="text-muted-foreground">
              {searchQuery || nameFilter !== NAME_FILTER_ALL
                ? 'Tente ajustar a busca ou o filtro'
                : 'Ainda não há canais cadastrados. Quando o administrador criar canais, eles aparecerão aqui.'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <Card className="border-border/60 bg-background/40">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20">
                    <th className="text-left py-3 px-4 font-semibold">Canal</th>
                    <th className="text-left py-3 px-4 font-semibold">Tipo</th>
                    <th className="text-left py-3 px-4 font-semibold">Descrição</th>
                    <th className="text-right py-3 px-4 font-semibold">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((channel) => (
                    <tr
                      key={channel.id}
                      className="border-b border-border/40 hover:bg-muted/20 cursor-pointer"
                      onClick={() => openChannel(channel)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 min-w-0">
                          {channel.icon ? renderIcon(channel.icon, 'h-4 w-4 shrink-0') : <Send className="h-4 w-4 shrink-0 opacity-70" />}
                          <span className="font-medium truncate">{channel.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{TYPE_LABELS[channel.channel_type]}</td>
                      <td className="py-3 px-4 text-muted-foreground max-w-[420px] truncate">{channel.description || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1.5 text-primary font-medium">
                          <ExternalLink className="w-4 h-4" />
                          Abrir
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 w-full">
          {filtered.map((channel, index) => (
            <motion.div
              key={channel.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group relative"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100 -z-10" />
              <div
                role="button"
                tabIndex={0}
                onClick={() => openChannel(channel)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openChannel(channel);
                  }
                }}
                className="relative h-full flex min-h-[188px] flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white/80 p-5 shadow-lg backdrop-blur-md transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:border-primary/30 hover:bg-white/90 hover:shadow-primary/10 dark:border-white/5 dark:bg-[#0d1520]/80 dark:hover:bg-[#0d1520]/90"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 via-primary/20 to-transparent opacity-80" />

                <div className="mb-4 flex items-start gap-4">
                  <div className="relative group/icon shrink-0">
                    <div className="absolute inset-0 bg-primary/20 blur-lg rounded-xl opacity-0 group-hover/icon:opacity-50 transition-opacity duration-500" />
                    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-white/10 dark:to-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-primary shadow-inner overflow-hidden">
                      {channel.icon ? (
                        renderIcon(channel.icon, 'w-7 h-7 object-contain drop-shadow')
                      ) : (
                        <Send className="w-7 h-7 opacity-70" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-primary transition-colors duration-300 truncate">
                      {channel.name}
                    </h3>
                    <span
                      className={`inline-flex mt-1 items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        channel.channel_type === 'setor'
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                          : 'bg-primary/15 border-primary/30 text-primary'
                      }`}
                    >
                      {TYPE_LABELS[channel.channel_type]}
                    </span>
                  </div>
                </div>

                <div className="mb-4 min-h-[40px]">
                  <p className="line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-muted-foreground/85">
                    {channel.description?.trim() || 'Canal para envio de solicitações e alinhamentos entre equipes.'}
                  </p>
                </div>

                <div className="mt-auto border-t border-slate-100 pt-4 dark:border-white/5">
                  {channel.url ? (
                    <div className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors group-hover:bg-primary/15">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir canal
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Sem link configurado</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
