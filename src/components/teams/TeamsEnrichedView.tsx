import type { ElementType } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { Users, MoreVertical, Check, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoadingGifScreen } from '@/components/LoadingGif';
import { cn } from '@/lib/utils';
import type { TeamLifecycleStatus } from '@/services/supabase';

export type TeamsViewMode = 'cards' | 'table';

export interface TeamDisplayRow {
  id: string;
  status: TeamLifecycleStatus;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sectors: string[];
  collaboratorCount: number;
}

const STATUS_OPTIONS: { value: TeamLifecycleStatus; label: string }[] = [
  { value: 'active', label: 'Ativo' },
  { value: 'archived', label: 'Arquivado' },
  { value: 'deleted', label: 'Excluído' },
];

function statusBadgeClass(status: TeamLifecycleStatus, onDarkCard = false) {
  if (onDarkCard) {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
      case 'archived':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
      case 'deleted':
        return 'bg-destructive/15 border-destructive/30 text-red-400';
      default:
        return 'bg-muted/30 border-white/10 text-muted-foreground';
    }
  }
  switch (status) {
    case 'active':
      return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400';
    case 'archived':
      return 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-400';
    case 'deleted':
      return 'bg-destructive/15 border-destructive/30 text-destructive dark:text-red-400';
    default:
      return 'bg-muted/50 border-border text-muted-foreground';
  }
}

function statusLabel(status: TeamLifecycleStatus) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function renderIcon(iconPath: string, className: string = '') {
  const isImg =
    iconPath?.startsWith('http') ||
    iconPath?.startsWith('/') ||
    /\.(svg|png|jpg|jpeg)$/i.test(iconPath ?? '');
  if (isImg && iconPath) {
    return <img src={iconPath} alt="" className={className} />;
  }
  const IconComponent =
    (Icons as unknown as Record<string, ElementType>)[iconPath] ?? Icons.Boxes;
  return <IconComponent className={className} />;
}

function TeamStatusActionsMenu({
  teamId,
  current,
  pending,
  onChange,
  triggerMuted,
}: {
  teamId: string;
  current: TeamLifecycleStatus;
  pending: boolean;
  onChange: (id: string, status: TeamLifecycleStatus) => void;
  triggerMuted?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={pending}
          className={cn(
            'h-8 w-8 shrink-0 rounded-lg',
            triggerMuted
              ? 'text-white/70 hover:text-white hover:bg-white/10'
              : 'text-muted-foreground hover:text-foreground',
          )}
          aria-label="Opções da equipe"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {STATUS_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            disabled={opt.value === current || pending}
            className={cn(opt.value === 'deleted' && 'text-destructive focus:text-destructive')}
            onClick={() => onChange(teamId, opt.value)}
          >
            <Check
              className={cn('mr-2 h-4 w-4 shrink-0', opt.value === current ? 'opacity-100' : 'opacity-0')}
              aria-hidden
            />
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface TeamsEnrichedViewProps {
  loading: boolean;
  rows: TeamDisplayRow[];
  viewMode: TeamsViewMode;
  variant: 'admin' | 'user';
  showStatusColumn: boolean;
  emptyTitle: string;
  emptyHint: string;
  /** Menu ⋮ para alterar status (somente painel admin). */
  showAdminActions?: boolean;
  onTeamStatusChange?: (teamId: string, status: TeamLifecycleStatus) => void;
  pendingTeamId?: string | null;
}

export function TeamsEnrichedView({
  loading,
  rows,
  viewMode,
  variant,
  showStatusColumn,
  emptyTitle,
  emptyHint,
  showAdminActions = false,
  onTeamStatusChange,
  pendingTeamId = null,
}: TeamsEnrichedViewProps) {
  const handleChange = (id: string, status: TeamLifecycleStatus) => {
    onTeamStatusChange?.(id, status);
  };

  if (loading) {
    return <LoadingGifScreen className="h-64" />;
  }

  if (rows.length === 0) {
    return (
      <Card className={variant === 'admin' ? 'border-border/50 bg-background/40' : ''}>
        <CardContent className="p-12 text-center">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-semibold mb-2">{emptyTitle}</h3>
          <p className="text-muted-foreground max-w-md mx-auto">{emptyHint}</p>
        </CardContent>
      </Card>
    );
  }

  const isAdminCards = variant === 'admin' && viewMode === 'cards';
  const isUserCards = variant === 'user' && viewMode === 'cards';

  if (viewMode === 'cards') {
    return (
      <div
        className={cn(
          'grid grid-cols-1 gap-4 w-full',
          isAdminCards && 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          isUserCards && 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6',
        )}
      >
        {rows.map((team, index) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, y: isUserCards ? 20 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * (isUserCards ? 0.05 : 0.03) }}
            className="group relative"
          >
            {isAdminCards ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10" />
                <div
                  className="relative h-full flex flex-col p-5 rounded-2xl border border-white/5 bg-[#0d1520]/80 backdrop-blur-md transition-all duration-300 shadow-lg hover:border-primary/30 hover:bg-[#0d1520]/90 hover:shadow-primary/5 hover:-translate-y-2"
                  style={
                    team.color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(team.color)
                      ? { borderLeftWidth: 4, borderLeftColor: team.color }
                      : undefined
                  }
                >
                  {showAdminActions && onTeamStatusChange ? (
                    <div className="absolute top-2 right-2 z-20">
                      <TeamStatusActionsMenu
                        teamId={team.id}
                        current={team.status}
                        pending={pendingTeamId === team.id}
                        onChange={handleChange}
                        triggerMuted
                      />
                    </div>
                  ) : null}
                  <div className="flex items-start justify-between gap-2 mb-3 pr-8">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-primary overflow-hidden">
                          {team.icon ? (
                            renderIcon(team.icon, 'w-7 h-7 object-contain drop-shadow')
                          ) : (
                            <Users className="w-7 h-7 opacity-60" />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-white tracking-tight truncate">{team.name}</h3>
                        {showStatusColumn && (
                          <span
                            className={cn(
                              'inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                              statusBadgeClass(team.status, true),
                            )}
                          >
                            {statusLabel(team.status)}
                          </span>
                        )}
                        {team.description ? (
                          <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">{team.description}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
                    {team.sectors.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground/50 italic">Nenhum setor listado</span>
                    ) : (
                      team.sectors.slice(0, 6).map((s) => (
                        <span
                          key={s}
                          className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 border border-primary/20 text-primary truncate max-w-full"
                          title={s}
                        >
                          {s}
                        </span>
                      ))
                    )}
                    {team.sectors.length > 6 ? (
                      <span className="text-[10px] text-muted-foreground">+{team.sectors.length - 6}</span>
                    ) : null}
                  </div>
                  <div className="pt-4 mt-auto border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-white/90">{team.collaboratorCount}</span>
                    <span>colaborador{team.collaboratorCount === 1 ? '' : 'es'}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10" />
                <div
                  className="relative h-full flex flex-col p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0d1520]/80 backdrop-blur-md transition-all duration-300 shadow-lg hover:border-primary/30 hover:bg-white/90 dark:hover:bg-[#0d1520]/90 hover:shadow-primary/5 hover:-translate-y-1"
                  style={
                    team.color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(team.color)
                      ? { borderLeftWidth: 4, borderLeftColor: team.color }
                      : undefined
                  }
                >
                  <div className="flex items-start gap-4 mb-3">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-white/10 dark:to-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-primary overflow-hidden">
                        {team.icon ? (
                          renderIcon(team.icon, 'w-7 h-7 object-contain drop-shadow')
                        ) : (
                          <Users className="w-7 h-7 opacity-70" />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                        {team.name}
                      </h3>
                      {team.description ? (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{team.description}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
                    {team.sectors.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground italic">Nenhum setor listado</span>
                    ) : (
                      team.sectors.slice(0, 6).map((s) => (
                        <span
                          key={s}
                          className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 border border-primary/20 text-primary truncate max-w-full"
                          title={s}
                        >
                          {s}
                        </span>
                      ))
                    )}
                    {team.sectors.length > 6 ? (
                      <span className="text-[10px] text-muted-foreground">+{team.sectors.length - 6}</span>
                    ) : null}
                  </div>
                  <div className="pt-4 mt-auto border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{team.collaboratorCount}</span>
                    <span>colaborador{team.collaboratorCount === 1 ? '' : 'es'}</span>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>
    );
  }

  /* table */
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-2 font-medium">Ícone</th>
            <th className="text-left py-3 px-2 font-medium">Nome</th>
            <th className="text-left py-3 px-2 font-medium">Descrição</th>
            <th className="text-left py-3 px-2 font-medium">Setores</th>
            <th className="text-left py-3 px-2 font-medium">Colaboradores</th>
            {showStatusColumn ? <th className="text-left py-3 px-2 font-medium">Status</th> : null}
            {showAdminActions && onTeamStatusChange ? (
              <th className="text-right py-3 px-2 font-medium w-12" aria-label="Ações" />
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((team) => (
            <tr key={team.id} className="border-b border-border/50 hover:bg-muted/30">
              <td className="py-2 px-2">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center overflow-hidden">
                  {team.icon ? (
                    renderIcon(team.icon, 'w-6 h-6 object-contain')
                  ) : (
                    <Users className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </td>
              <td className="py-2 px-2 font-medium">{team.name}</td>
              <td className="py-2 px-2 text-muted-foreground max-w-[220px] line-clamp-2" title={team.description ?? ''}>
                {team.description || '—'}
              </td>
              <td className="py-2 px-2 text-muted-foreground max-w-[280px]">
                {team.sectors.length ? (
                  <span className="line-clamp-2" title={team.sectors.join(', ')}>
                    {team.sectors.join(', ')}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="py-2 px-2 font-medium tabular-nums">{team.collaboratorCount}</td>
              {showStatusColumn ? (
                <td className="py-2 px-2">
                  <span
                    className={cn(
                      'inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                      statusBadgeClass(team.status),
                    )}
                  >
                    {statusLabel(team.status)}
                  </span>
                </td>
              ) : null}
              {showAdminActions && onTeamStatusChange ? (
                <td className="py-2 px-2 text-right align-middle">
                  <div className="flex justify-end">
                    <TeamStatusActionsMenu
                      teamId={team.id}
                      current={team.status}
                      pending={pendingTeamId === team.id}
                      onChange={handleChange}
                    />
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
