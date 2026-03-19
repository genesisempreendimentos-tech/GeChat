import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Send, ExternalLink, Filter, ChevronDown, Boxes } from 'lucide-react';
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
import {
  databaseService,
  type RequestChannel,
  type RequestChannelType,
} from '@/services/supabase';
import { LoadingGifScreen } from '@/components/LoadingGif';

const CHANNEL_FILTER_ALL = 'all';
const TYPE_LABELS: Record<RequestChannelType, string> = {
  departamento: 'Departamento',
  setor: 'Setor',
};

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
  const [channelFilterId, setChannelFilterId] = useState<string>(CHANNEL_FILTER_ALL);

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

  const filterTriggerLabel = useMemo(() => {
    if (channelFilterId === CHANNEL_FILTER_ALL) return 'Todos os departamentos';
    const ch = channels.find((c) => c.id === channelFilterId);
    return ch?.name ?? 'Todos os departamentos';
  }, [channelFilterId, channels]);

  const filtered = channels.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.url ?? '').toLowerCase().includes(q);
    const matchChannel =
      channelFilterId === CHANNEL_FILTER_ALL || c.id === channelFilterId;
    return matchSearch && matchChannel;
  });

  const openChannel = (c: RequestChannel) => {
    if (c.url) window.open(c.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Send className="w-8 h-8 shrink-0" />
          Solicitações
        </h1>
        <p className="text-muted-foreground mt-2">
          Envie solicitações para outros departamentos
        </p>
      </div>

      <div className="p-1 rounded-2xl bg-white/50 dark:bg-[#0d1520]/50 border border-slate-200 dark:border-white/5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-2 p-2">
          <div className="flex-1 relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors duration-200" />
            <Input
              placeholder="Buscar departamentos ou setores"
              className="pl-11 h-12 rounded-xl border-border/60 bg-muted/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className="min-w-[200px] h-12 justify-between border-border/60 bg-muted/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background rounded-xl"
              >
                <div className="flex items-center min-w-0">
                  <Filter className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{filterTriggerLabel}</span>
                </div>
                <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="max-h-[280px] min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto bg-white dark:bg-[#0d1520] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
            >
              <DropdownMenuItem
                onClick={() => setChannelFilterId(CHANNEL_FILTER_ALL)}
                className="focus:bg-primary/20 focus:text-primary cursor-pointer"
              >
                Todos os departamentos
              </DropdownMenuItem>
              {channels.length === 0 ? (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  Nenhum departamento cadastrado ainda
                </div>
              ) : (
                channels
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                  .map((c) => (
                    <DropdownMenuItem
                      key={c.id}
                      onClick={() => setChannelFilterId(c.id)}
                      className="focus:bg-primary/20 focus:text-primary cursor-pointer"
                    >
                      <span className="truncate">{c.name}</span>
                    </DropdownMenuItem>
                  ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {loading ? (
        <LoadingGifScreen className="h-64" />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Send className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2">Nenhum canal encontrado</h3>
            <p className="text-muted-foreground">
              {searchQuery || channelFilterId !== CHANNEL_FILTER_ALL
                ? 'Tente ajustar a busca ou o filtro'
                : 'Ainda não há canais cadastrados. Quando o administrador criar canais, eles aparecerão aqui.'}
            </p>
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
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10" />
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
                className="relative h-full flex flex-col justify-between p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0d1520]/80 backdrop-blur-md transition-all duration-300 shadow-lg cursor-pointer hover:border-primary/30 hover:bg-white/90 dark:hover:bg-[#0d1520]/90 hover:shadow-primary/5 hover:-translate-y-1"
              >
                <div className="flex items-start gap-4 mb-4">
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
                      className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        channel.channel_type === 'setor'
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                          : 'bg-primary/15 border-primary/30 text-primary'
                      }`}
                    >
                      {TYPE_LABELS[channel.channel_type]}
                    </span>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex justify-end">
                  {channel.url ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">
                      <ExternalLink className="w-4 h-4" />
                      Abrir canal
                    </span>
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
