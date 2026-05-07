import type { ElementType } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { Users, MoreVertical, Check, Layers, SquareCheck, Archive, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LoadingGif, LoadingGifScreen } from '@/components/LoadingGif';
import { cn } from '@/lib/utils';
import { TRANSLUCENT_BIG_BOX } from '@/lib/translucentBigBox';
import type { TeamLifecycleStatus } from '@/services/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarGroup, AvatarGroupItem, AvatarGroupTooltip } from '@/components/ui/avatar-group';

export type TeamsViewMode = 'cards' | 'table';

export interface TeamCollaboratorPreview {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface TeamSectorItem {
  name: string;
  icon: string | null;
  color: string | null;
}

export interface TeamDisplayRow {
  id: string;
  status: TeamLifecycleStatus;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sectors: string[];
  /** Ícone/cor por setor (mock); usado nas miniboxes em vez de chips. */
  sectorItems?: TeamSectorItem[];
  collaboratorCount: number;
  collaborators?: TeamCollaboratorPreview[];
}

const SECTOR_COLOR_HEX_MAP: Record<string, string> = {
  'bg-red-500': '#ef4444',
  'bg-orange-500': '#f97316',
  'bg-amber-500': '#f59e0b',
  'bg-yellow-500': '#eab308',
  'bg-lime-500': '#84cc16',
  'bg-green-500': '#22c55e',
  'bg-emerald-500': '#10b981',
  'bg-teal-500': '#14b8a6',
  'bg-cyan-500': '#06b6d4',
  'bg-sky-500': '#0ea5e9',
  'bg-blue-500': '#3b82f6',
  'bg-indigo-500': '#6366f1',
  'bg-violet-500': '#8b5cf6',
  'bg-purple-500': '#a855f7',
  'bg-fuchsia-500': '#d946ef',
  'bg-pink-500': '#ec4899',
  'bg-rose-500': '#f43f5e',
  'bg-orange-400': '#fb923c',
  'bg-amber-400': '#fbbf24',
  'bg-yellow-400': '#facc15',
  'bg-lime-400': '#a3e635',
  'bg-teal-400': '#2dd4bf',
  'bg-cyan-400': '#22d3ee',
  'bg-blue-400': '#60a5fa',
  'bg-violet-400': '#a78bfa',
  'bg-slate-500': '#64748b',
  'bg-gray-500': '#6b7280',
  'bg-zinc-500': '#71717a',
  'bg-neutral-500': '#737373',
  'bg-stone-500': '#78716c',
  'bg-red-400': '#f87171',
  'bg-green-400': '#4ade80',
};

function normalizeSectorColorForCard(color: string | null | undefined): string | null {
  if (!color) return null;
  const c = color.trim();
  if (SECTOR_COLOR_HEX_MAP[c]) return SECTOR_COLOR_HEX_MAP[c];
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{8})$/.test(c)) return c;
  if (/^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(c)) return `#${c}`;
  return null;
}

function getSectorItemsForCard(team: TeamDisplayRow): TeamSectorItem[] {
  if (team.sectorItems?.length) return team.sectorItems;
  return team.sectors.map((name) => ({ name, icon: null, color: null }));
}

/** Opções do menu ⋮ (arquivar removido do produto). */
const TEAM_STATUS_MENU_OPTIONS: { value: TeamLifecycleStatus; label: string }[] = [
  { value: 'active', label: 'Ativo' },
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

const TEAM_LIFECYCLE_STATUS_META: Record<
  TeamLifecycleStatus,
  { Icon: typeof SquareCheck; label: string }
> = {
  active: { Icon: SquareCheck, label: 'Ativo' },
  archived: { Icon: Archive, label: 'Arquivado' },
  deleted: { Icon: Trash2, label: 'Excluído' },
};

const teamStatusTooltipClass =
  'rounded-xl border border-border/60 bg-card/95 backdrop-blur-xl px-3 py-2 text-xs font-semibold text-foreground shadow-lg';

function TeamLifecycleStatusIconBadge({
  status,
  variant,
}: {
  status: TeamLifecycleStatus;
  variant: 'card-dark' | 'table';
}) {
  const { Icon, label } = TEAM_LIFECYCLE_STATUS_META[status];
  const onDark = variant === 'card-dark';
  const cls = statusBadgeClass(status, onDark);
  const box = variant === 'card-dark' ? 'h-7 w-7' : 'h-6 w-6';
  const iconSz = variant === 'card-dark' ? 'h-3.5 w-3.5' : 'h-3 w-3';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label={label}
          tabIndex={0}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'inline-flex items-center justify-center rounded-full border shrink-0 cursor-default outline-none',
            'focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
            onDark ? 'focus-visible:ring-offset-[#0d1520]' : 'focus-visible:ring-offset-background',
            box,
            cls,
          )}
        >
          <Icon className={cn(iconSz, 'shrink-0')} strokeWidth={2} aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className={teamStatusTooltipClass}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
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

function SectorMiniboxList({ team, variant }: { team: TeamDisplayRow; variant: 'admin' | 'user' }) {
  const items = getSectorItemsForCard(team);
  if (items.length === 0) {
    return (
      <span
        className={cn(
          'text-[10px] italic mb-4 block',
          variant === 'admin' ? 'text-white/50' : 'text-muted-foreground',
        )}
      >
        Nenhum setor listado
      </span>
    );
  }
  return (
    <div
      className={cn(
        'flex flex-col gap-2 mb-4 min-h-0',
        items.length > 4 && 'max-h-[220px] overflow-y-auto pr-0.5',
      )}
    >
      {items.map((item) => {
        const hex = normalizeSectorColorForCard(item.color);
        const iconFallbackStyle =
          variant === 'user'
            ? {
                backgroundColor: 'hsl(var(--muted))',
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--primary))',
              }
            : {
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderColor: 'rgba(255,255,255,0.1)',
                color: 'hsl(var(--primary))',
              };
        return (
          <div
            key={item.name}
            className="flex items-center gap-2 rounded-xl bg-muted/40 px-2.5 py-2 dark:bg-white/[0.06]"
            title={item.name}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border shadow-sm dark:bg-black/25"
              style={
                hex
                  ? {
                      backgroundColor: `${hex}18`,
                      borderColor: `${hex}35`,
                      color: hex,
                    }
                  : iconFallbackStyle
              }
            >
              {item.icon ? (
                renderIcon(item.icon, 'h-3.5 w-3.5 rounded-full object-cover')
              ) : (
                <Layers className="h-3.5 w-3.5" aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">Setor</p>
              <p
                className={cn(
                  'truncate text-xs font-medium',
                  variant === 'admin' ? 'text-white/95' : 'text-foreground',
                )}
              >
                {item.name}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
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
          {pending ? <LoadingGif size="sm" /> : <MoreVertical className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {TEAM_STATUS_MENU_OPTIONS.map((opt) => (
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

function DepartmentCardCollaboratorAvatar({
  c,
  team,
  variant,
  onPreviewClick,
  loadingCollaboratorId,
}: {
  c: TeamCollaboratorPreview;
  team: TeamDisplayRow;
  variant: 'admin' | 'user';
  onPreviewClick?: (preview: TeamCollaboratorPreview, row: TeamDisplayRow) => void;
  loadingCollaboratorId: string | null;
}) {
  const borderClass =
    variant === 'admin' ? 'border-2 border-[#0d1520]' : 'border-2 border-white dark:border-[#0d1520]';
  const loading = loadingCollaboratorId === c.id;
  const avatar = (
    <Avatar className={cn('w-8 h-8 ring-0 shadow-sm', borderClass)}>
      <AvatarImage src={c.avatar} alt={c.name} className="object-cover" />
      <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">
        {c.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
  return (
    <AvatarGroupItem
      tooltip={c.name}
      loading={loading}
      onClick={onPreviewClick ? () => onPreviewClick(c, team) : undefined}
    >
      {avatar}
    </AvatarGroupItem>
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
  /** Clique no card do departamento (abre modal de detalhes/acesso). */
  onCardClick?: (row: TeamDisplayRow) => void;
  /** Clique no badge de contagem de colaboradores (ex.: lista em modal). */
  onCollaboratorBadgeClick?: (row: TeamDisplayRow) => void;
  /** Clique no avatar de um colaborador no rodapé do card (abre popup de perfil). */
  onCollaboratorPreviewClick?: (preview: TeamCollaboratorPreview, row: TeamDisplayRow) => void;
  /** Enquanto o perfil carrega (mesmo id do preview). */
  loadingCollaboratorId?: string | null;
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
  onCardClick,
  onCollaboratorBadgeClick,
  onCollaboratorPreviewClick,
  loadingCollaboratorId = null,
}: TeamsEnrichedViewProps) {
  const handleChange = (id: string, status: TeamLifecycleStatus) => {
    onTeamStatusChange?.(id, status);
  };

  if (loading) {
    return <LoadingGifScreen className="h-64" />;
  }

  if (rows.length === 0) {
    return (
      <Card className={cn(TRANSLUCENT_BIG_BOX, 'shadow-none')}>
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
      <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'grid grid-cols-1 gap-4 w-full',
          /* Departamentos: 4 colunas (cards mais estreitos), alinhado a setores/colaboradores */
          isAdminCards && 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          isUserCards && 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-6',
        )}
      >
        {rows.map((team, index) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, y: isUserCards ? 20 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * (isUserCards ? 0.05 : 0.03) }}
            whileHover={{ y: isAdminCards ? -8 : -4, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } }}
            className="group relative"
          >
            {isAdminCards ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10" />
                <div
                  className={cn(
                    "relative h-full flex flex-col p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0d1520]/80 backdrop-blur-md transition-all duration-300 shadow-lg hover:border-primary/30 hover:bg-white/90 dark:hover:bg-[#0d1520]/90 hover:shadow-primary/5",
                    onCardClick && "cursor-pointer"
                  )}
                  onClick={() => onCardClick?.(team)}
                  style={
                    team.color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(team.color)
                      ? { borderLeftWidth: 4, borderLeftColor: team.color }
                      : undefined
                  }
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-white/10 dark:to-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-primary overflow-hidden">
                          {team.icon ? (
                            renderIcon(team.icon, 'w-7 h-7 object-contain drop-shadow')
                          ) : (
                            <Users className="w-7 h-7 opacity-60" />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate leading-snug">{team.name}</h3>
                        {team.description ? (
                          <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">{team.description}</p>
                        ) : null}
                      </div>
                    </div>
                    {(showStatusColumn || (showAdminActions && onTeamStatusChange)) ? (
                      <div
                        className="flex h-12 shrink-0 items-center gap-1.5 z-20"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {showStatusColumn ? (
                          <TeamLifecycleStatusIconBadge status={team.status} variant="card-dark" />
                        ) : null}
                        {showAdminActions && onTeamStatusChange ? (
                          <TeamStatusActionsMenu
                            teamId={team.id}
                            current={team.status}
                            pending={pendingTeamId === team.id}
                            onChange={handleChange}
                            triggerMuted
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col flex-1 mt-4">
                    <SectorMiniboxList team={team} variant="admin" />
                    <div className="pt-4 mt-auto border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      {team.collaborators && team.collaborators.length > 0 ? (
                        <AvatarGroup className="justify-start">
                          {team.collaborators.slice(0, 5).map((c) => (
                            <DepartmentCardCollaboratorAvatar
                              key={c.id}
                              c={c}
                              team={team}
                              variant="admin"
                              onPreviewClick={onCollaboratorPreviewClick}
                              loadingCollaboratorId={loadingCollaboratorId}
                            />
                          ))}
                          {team.collaborators.length > 5 &&
                            (onCollaboratorBadgeClick ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-[#0d1520]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCollaboratorBadgeClick(team);
                                    }}
                                    aria-label={`Ver mais ${team.collaborators.length - 5} colaboradores`}
                                  >
                                    <Avatar className="w-8 h-8 border-2 border-white dark:border-[#0d1520] shadow-sm">
                                      <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-bold">
                                        +{team.collaborators.length - 5}
                                      </AvatarFallback>
                                    </Avatar>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-xs">
                                  {team.collaborators.slice(5).map((x) => x.name).join(', ')}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <div className="relative">
                                <Avatar className="w-8 h-8 border-2 border-white dark:border-[#0d1520] shadow-sm">
                                  <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-bold">
                                    +{team.collaborators.length - 5}
                                  </AvatarFallback>
                                </Avatar>
                                <AvatarGroupTooltip>
                                  {team.collaborators.slice(5).map((x) => x.name).join(', ')}
                                </AvatarGroupTooltip>
                              </div>
                            ))}
                        </AvatarGroup>
                      ) : (
                        <span className="text-muted-foreground/60 dark:text-white/40 italic text-[11px]">Sem colaboradores</span>
                      )}
                      {team.collaboratorCount > 0 ? (
                        onCollaboratorBadgeClick ? (
                          <button
                            type="button"
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 shrink-0 hover:bg-slate-200/90 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCollaboratorBadgeClick(team);
                            }}
                            aria-label={`Ver ${team.collaboratorCount} colaboradores`}
                          >
                            <span className="text-[11px] font-medium text-slate-700 dark:text-white/70">{team.collaboratorCount}</span>
                            <Users className="w-3.5 h-3.5 text-slate-500 dark:text-white/40" aria-hidden />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 shrink-0">
                            <span className="text-[11px] font-medium text-slate-700 dark:text-white/70">{team.collaboratorCount}</span>
                            <Users className="w-3.5 h-3.5 text-slate-500 dark:text-white/40" aria-hidden />
                          </div>
                        )
                      ) : null}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10" />
                <div
                  className={cn(
                    "relative h-full flex flex-col p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0d1520]/80 backdrop-blur-md transition-all duration-300 shadow-lg hover:border-primary/30 hover:bg-white/90 dark:hover:bg-[#0d1520]/90 hover:shadow-primary/5",
                    onCardClick && "cursor-pointer"
                  )}
                  onClick={() => onCardClick?.(team)}
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
                  <div className="flex flex-col flex-1 mt-4">
                    <SectorMiniboxList team={team} variant="user" />
                    <div className="pt-4 mt-auto border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      {team.collaborators && team.collaborators.length > 0 ? (
                        <AvatarGroup className="justify-start">
                          {team.collaborators.slice(0, 5).map((c) => (
                            <DepartmentCardCollaboratorAvatar
                              key={c.id}
                              c={c}
                              team={team}
                              variant="user"
                              onPreviewClick={onCollaboratorPreviewClick}
                              loadingCollaboratorId={loadingCollaboratorId}
                            />
                          ))}
                          {team.collaborators.length > 5 &&
                            (onCollaboratorBadgeClick ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCollaboratorBadgeClick(team);
                                    }}
                                    aria-label={`Ver mais ${team.collaborators.length - 5} colaboradores`}
                                  >
                                    <Avatar className="w-8 h-8 border-2 border-white dark:border-[#0d1520] shadow-sm">
                                      <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-bold">
                                        +{team.collaborators.length - 5}
                                      </AvatarFallback>
                                    </Avatar>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-xs">
                                  {team.collaborators.slice(5).map((x) => x.name).join(', ')}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <div className="relative">
                                <Avatar className="w-8 h-8 border-2 border-white dark:border-[#0d1520] shadow-sm">
                                  <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-bold">
                                    +{team.collaborators.length - 5}
                                  </AvatarFallback>
                                </Avatar>
                                <AvatarGroupTooltip>
                                  {team.collaborators.slice(5).map((x) => x.name).join(', ')}
                                </AvatarGroupTooltip>
                              </div>
                            ))}
                        </AvatarGroup>
                      ) : (
                        <span className="text-muted-foreground/50 italic text-[11px]">Sem colaboradores</span>
                      )}
                      {team.collaboratorCount > 0 ? (
                        onCollaboratorBadgeClick ? (
                          <button
                            type="button"
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 shrink-0 hover:bg-slate-200/90 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCollaboratorBadgeClick(team);
                            }}
                            aria-label={`Ver ${team.collaboratorCount} colaboradores`}
                          >
                            <span className="text-[11px] font-medium text-slate-700 dark:text-white/70">
                              {team.collaboratorCount}
                            </span>
                            <Users className="w-3.5 h-3.5 text-slate-500 dark:text-white/40" aria-hidden />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 shrink-0">
                            <span className="text-[11px] font-medium text-slate-700 dark:text-white/70">
                              {team.collaboratorCount}
                            </span>
                            <Users className="w-3.5 h-3.5 text-slate-500 dark:text-white/40" aria-hidden />
                          </div>
                        )
                      ) : null}
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>
      </TooltipProvider>
    );
  }

  /* table */
  return (
    <TooltipProvider delayDuration={200}>
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
              <td className="py-2 px-2 font-medium tabular-nums">
                {onCollaboratorBadgeClick && team.collaboratorCount > 0 ? (
                  <button
                    type="button"
                    className="tabular-nums underline-offset-2 hover:underline text-primary font-semibold"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCollaboratorBadgeClick(team);
                    }}
                    aria-label={`Ver ${team.collaboratorCount} colaboradores`}
                  >
                    {team.collaboratorCount}
                  </button>
                ) : (
                  team.collaboratorCount
                )}
              </td>
              {showStatusColumn ? (
                <td className="py-2 px-2">
                  <TeamLifecycleStatusIconBadge status={team.status} variant="table" />
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
    </TooltipProvider>
  );
}
