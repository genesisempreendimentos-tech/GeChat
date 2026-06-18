import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Pencil, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MainViewHeader } from '@/components/layout/header';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { AdminControlLine, type ViewMode } from '@/admin/components/AdminControlLine';
import { AdminBigBox } from '@/admin/components/AdminBigBox';
import { LoadingGifScreen } from '@/components/LoadingGif';
import {
  EmpreendimentoGenesisCard,
  EmpreendimentoAliasesBadge,
  formatEmpreendimentoCount,
  formatEmpreendimentoPct,
} from '@/components/empreendimentos/EmpreendimentoGenesisCard';
import { EmpreendimentoGenesisLogo } from '@/components/empreendimentos/EmpreendimentoGenesisLogo';
import { cn } from '@/lib/utils';
import type { EmpreendimentoGenesis } from '@/types/empreendimentos';

type EmpreendimentosPanelViewProps = {
  mode: 'admin' | 'user';
  empreendimentos: EmpreendimentoGenesis[];
  loading?: boolean;
  pendingAliases?: number;
  onAdd?: () => void;
  onEdit?: (item: EmpreendimentoGenesis) => void;
  onRefresh?: () => void;
};

function EmpreendimentoStatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        ativo
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
          : 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
      )}
    >
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  );
}

export function EmpreendimentosPanelView({
  mode,
  empreendimentos,
  loading = false,
  pendingAliases = 0,
  onAdd,
  onEdit,
}: EmpreendimentosPanelViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const isAdmin = mode === 'admin';

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return empreendimentos;
    return empreendimentos.filter((item) => item.nome.toLowerCase().includes(q));
  }, [empreendimentos, searchQuery]);

  return (
    <MainViewFluidShell>
      <div className="space-y-6">
        <MainViewHeader
          icon={<Building2 className="h-6 w-6" />}
          title="Empreendimentos"
          description={
            isAdmin
              ? 'Registro canônico e classificação de aliases de interesse.'
              : 'Empreendimentos Genesis e volume de leads por empreendimento.'
          }
          button={
            isAdmin && onAdd ? (
              <Button
                onClick={onAdd}
                className="h-10 rounded-xl px-4 font-semibold shadow-sm shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/30"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar empreendimento
              </Button>
            ) : undefined
          }
        />

        <AdminControlLine
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          leftContent={
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative group/search">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors duration-200" />
                <Input
                  placeholder="Buscar empreendimentos..."
                  className="pl-8 w-64 h-9 rounded-xl border-border/60 bg-muted/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {isAdmin && pendingAliases > 0 ? (
                <Badge variant="secondary" className="rounded-lg px-2.5 py-1">
                  {pendingAliases} alias(es) a classificar
                </Badge>
              ) : null}
            </div>
          }
          showViewToggle
        />

        <AdminBigBox>
          {loading ? (
            <LoadingGifScreen className="h-64" />
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum empreendimento encontrado.</p>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <EmpreendimentoGenesisCard item={item} isAdmin={isAdmin} onEdit={onEdit} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Logo</th>
                    <th className="text-left py-3 px-4 font-medium">Nome</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-right py-3 px-4 font-medium">Aliases</th>
                    <th className="text-right py-3 px-4 font-medium">Leads</th>
                    <th className="text-right py-3 px-4 font-medium">Do total</th>
                    <th className="text-right py-3 px-4 font-medium">Qualificados</th>
                    <th className="text-right py-3 px-4 font-medium">Reservas</th>
                    <th className="text-right py-3 px-4 font-medium">Andamento</th>
                    <th className="text-right py-3 px-4 font-medium">Vendas</th>
                    {isAdmin ? <th className="text-right py-3 px-4 font-medium">Ações</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-2 px-4">
                        <EmpreendimentoGenesisLogo item={item} size="sm" />
                      </td>
                      <td className="py-2 px-4 font-medium">{item.nome}</td>
                      <td className="py-2 px-4">
                        <EmpreendimentoStatusBadge ativo={item.ativo} />
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex justify-end">
                          <EmpreendimentoAliasesBadge count={item.aliases_count} />
                        </div>
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums font-medium">
                        {formatEmpreendimentoCount(item.leads_count)}
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums">
                        {formatEmpreendimentoPct(item.percentual_do_total ?? 0)}
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums">
                        {formatEmpreendimentoPct(item.taxa_qualificacao ?? 0)}
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums">
                        {formatEmpreendimentoCount(item.reservas_count ?? 0)}
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums">
                        {formatEmpreendimentoCount(item.v_andamento_count ?? 0)}
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums font-medium">
                        {formatEmpreendimentoCount(item.vendas_count ?? 0)}
                      </td>
                      {isAdmin && onEdit ? (
                        <td className="py-2 px-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                            <Pencil className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminBigBox>
      </div>
    </MainViewFluidShell>
  );
}
