import type { ElementType } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { Building2, Layers, Mail, UserCircle, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingGif, LoadingGifScreen } from '@/components/LoadingGif';
import type { TeamsViewMode, TeamCollaboratorPreview } from '@/components/teams/TeamsEnrichedView';
import type { NeonTeamCollaborator } from '@/services/corporateProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarGroup, AvatarGroupItem, AvatarGroupTooltip } from '@/components/ui/avatar-group';
import { cn } from '@/lib/utils';
import { TRANSLUCENT_BIG_BOX } from '@/lib/translucentBigBox';

export interface SectorTopicRow {
  id: string;
  /** Equipe (team) no Supabase — usado no modal de acesso por setor */
  teamId: string;
  /** Departamento Neon vinculado à equipe */
  neonDepartmentId: string;
  sectorName: string;
  departmentName: string;
  collaboratorCount: number;
  icon: string | null;
  color: string | null;
  collaborators?: TeamCollaboratorPreview[];
}

export interface CollaboratorWithAvatar extends NeonTeamCollaborator {
  avatar?: string;
  departmentIcon?: string | null;
  departmentColor?: string | null;
  sectorIcon?: string | null;
  sectorColor?: string | null;
}

const COLOR_HEX_MAP: Record<string, string> = {
  'bg-red-500': '#ef4444', 'bg-orange-500': '#f97316', 'bg-amber-500': '#f59e0b',
  'bg-yellow-500': '#eab308', 'bg-lime-500': '#84cc16', 'bg-green-500': '#22c55e',
  'bg-emerald-500': '#10b981', 'bg-teal-500': '#14b8a6', 'bg-cyan-500': '#06b6d4',
  'bg-sky-500': '#0ea5e9', 'bg-blue-500': '#3b82f6', 'bg-indigo-500': '#6366f1',
  'bg-violet-500': '#8b5cf6', 'bg-purple-500': '#a855f7', 'bg-fuchsia-500': '#d946ef',
  'bg-pink-500': '#ec4899', 'bg-rose-500': '#f43f5e', 'bg-orange-400': '#fb923c',
  'bg-amber-400': '#fbbf24', 'bg-yellow-400': '#facc15', 'bg-lime-400': '#a3e635',
  'bg-teal-400': '#2dd4bf', 'bg-cyan-400': '#22d3ee', 'bg-blue-400': '#60a5fa',
  'bg-violet-400': '#a78bfa',
  // legadas
  'bg-slate-500': '#64748b', 'bg-gray-500': '#6b7280', 'bg-zinc-500': '#71717a',
  'bg-neutral-500': '#737373', 'bg-stone-500': '#78716c', 'bg-red-400': '#f87171',
  'bg-green-400': '#4ade80',
};

function normalizeColor(color: string | null | undefined): string | null {
  if (!color) return null;
  const c = color.trim();
  // Classe Tailwind salva no Neon (ex: "bg-blue-500")
  if (COLOR_HEX_MAP[c]) return COLOR_HEX_MAP[c];
  // Já é hex válido com #
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{8})$/.test(c)) return c;
  // Hex sem # — adiciona
  if (/^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(c)) return `#${c}`;
  return null;
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

interface AdminEquipesTopicViewProps {
  variant: 'sectors' | 'collaborators';
  viewMode: TeamsViewMode;
  loading: boolean;
  sectorRows: SectorTopicRow[];
  collaboratorRows: CollaboratorWithAvatar[];
  emptyTitle: string;
  emptyHint: string;
  onCollaboratorClick?: (collaborator: CollaboratorWithAvatar) => void;
  loadingCollaboratorId?: string | null;
  onSectorClick?: (row: SectorTopicRow) => void;
  /** Clique no badge de contagem (cartões de setor). */
  onSectorCollaboratorBadgeClick?: (row: SectorTopicRow) => void;
  /** Clique no avatar do colaborador no rodapé do cartão de setor. */
  onSectorCollaboratorPreviewClick?: (collaborator: TeamCollaboratorPreview, row: SectorTopicRow) => void;
}

export function AdminEquipesTopicView({
  variant,
  viewMode,
  loading,
  sectorRows,
  collaboratorRows,
  emptyTitle,
  emptyHint,
  onCollaboratorClick,
  loadingCollaboratorId,
  onSectorClick,
  onSectorCollaboratorBadgeClick,
  onSectorCollaboratorPreviewClick,
}: AdminEquipesTopicViewProps) {
  if (loading) {
    return <LoadingGifScreen className="h-64" />;
  }

  if (variant === 'sectors') {
    if (sectorRows.length === 0) {
      return (
        <Card className="border-border/50 bg-background/40">
          <CardContent className="p-12 text-center">
            <Layers className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2">{emptyTitle}</h3>
            <p className="text-muted-foreground max-w-md mx-auto">{emptyHint}</p>
          </CardContent>
        </Card>
      );
    }

    if (viewMode === 'cards') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
          {sectorRows.map((row, index) => (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="relative"
            >
              <div
                className="relative h-full flex flex-col p-5 rounded-2xl border border-white/5 bg-[#0d1520]/80 backdrop-blur-md transition-all duration-300 shadow-lg"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border shadow-sm"
                    style={
                      normalizeColor(row.color)
                        ? {
                            backgroundColor: `${normalizeColor(row.color)}15`,
                            borderColor: `${normalizeColor(row.color)}30`,
                            color: normalizeColor(row.color)!,
                          }
                        : {
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                            borderColor: 'rgba(255,255,255,0.1)',
                            color: '#94a3b8',
                          }
                    }
                  >
                    {row.icon ? (
                      renderIcon(row.icon, 'w-6 h-6 object-contain opacity-90')
                    ) : (
                      <Layers className="w-6 h-6 opacity-70" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h3 className="text-base font-semibold text-white tracking-tight truncate leading-tight">
                      {row.sectorName}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div 
                        className="w-1.5 h-1.5 rounded-full" 
                        style={{ backgroundColor: normalizeColor(row.color) || '#94a3b8' }}
                      />
                      <p className="text-[13px] text-muted-foreground truncate" title={row.departmentName}>
                        {row.departmentName}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 mt-auto border-t border-white/5 flex items-center justify-between gap-3">
                  {row.collaborators && row.collaborators.length > 0 ? (
                    <AvatarGroup className="justify-start">
                      {row.collaborators.slice(0, 5).map((c) => (
                        <AvatarGroupItem
                          key={c.id}
                          tooltip={c.name}
                          loading={loadingCollaboratorId === c.id}
                          onClick={
                            onSectorCollaboratorPreviewClick
                              ? () => {
                                  onSectorCollaboratorPreviewClick(c, row);
                                }
                              : undefined
                          }
                        >
                          <Avatar className={cn('w-8 h-8 border-2 border-[#0d1520] ring-0 shadow-sm', onSectorCollaboratorPreviewClick && 'cursor-pointer')}>
                            <AvatarImage src={c.avatar} alt={c.name} />
                            <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-semibold">
                              {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </AvatarGroupItem>
                      ))}
                      {row.collaborators.length > 5 && (
                        <div className="relative">
                          <Avatar className="w-8 h-8 border-2 border-[#0d1520] shadow-sm">
                            <AvatarFallback className="text-[11px] bg-muted text-muted-foreground font-semibold">
                              +{row.collaborators.length - 5}
                            </AvatarFallback>
                          </Avatar>
                          <AvatarGroupTooltip>
                            {row.collaborators.slice(5).map((c) => c.name).join(', ')}
                          </AvatarGroupTooltip>
                        </div>
                      )}
                    </AvatarGroup>
                  ) : (
                    <div className="flex items-center gap-2 text-white/30">
                      <UserCircle className="w-4 h-4" />
                      <span className="text-[12px] font-medium">Sem equipe</span>
                    </div>
                  )}
                  
                  {row.collaboratorCount > 0 &&
                    (onSectorCollaboratorBadgeClick ? (
                      <button
                        type="button"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/15 transition-colors cursor-pointer shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSectorCollaboratorBadgeClick(row);
                        }}
                        aria-label={`Ver ${row.collaboratorCount} colaboradores`}
                      >
                        <span className="text-[11px] font-medium text-white/70">{row.collaboratorCount}</span>
                        <Users className="w-3.5 h-3.5 text-white/40" aria-hidden />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5 shrink-0">
                        <span className="text-[11px] font-medium text-white/70">{row.collaboratorCount}</span>
                        <Users className="w-3.5 h-3.5 text-white/40" aria-hidden />
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 font-medium">Setor</th>
              <th className="text-left py-3 px-2 font-medium">Departamento</th>
              <th className="text-right py-3 px-2 font-medium">Colaboradores</th>
            </tr>
          </thead>
          <tbody>
            {sectorRows.map((row) => {
              const color = normalizeColor(row.color);
              return (
                <tr
                  key={row.id}
                  className="border-b border-border/50"
                >
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
                        style={
                          color
                            ? { backgroundColor: `${color}22`, borderColor: `${color}44`, color }
                            : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#f59e0b' }
                        }
                      >
                        {row.icon ? renderIcon(row.icon, 'w-4 h-4') : <Layers className="w-4 h-4 opacity-60" />}
                      </div>
                      <span className="font-medium">{row.sectorName}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{row.departmentName}</td>
                  <td className="py-2 px-2 text-right tabular-nums font-medium">{row.collaboratorCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  /* collaborators */
  if (collaboratorRows.length === 0) {
    return (
      <Card className={cn(TRANSLUCENT_BIG_BOX, 'shadow-none')}>
        <CardContent className="p-12 text-center">
          <UserCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-semibold mb-2">{emptyTitle}</h3>
          <p className="text-muted-foreground max-w-md mx-auto">{emptyHint}</p>
        </CardContent>
      </Card>
    );
  }

  if (viewMode === 'cards') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
        {collaboratorRows.map((c, index) => {
          const isLoading = loadingCollaboratorId === c.id;
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -3, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } }}
              className="group relative h-full cursor-pointer"
              onClick={() => onCollaboratorClick?.(c)}
            >
              <div className="absolute -inset-px rounded-[1.15rem] bg-gradient-to-br from-primary/25 via-primary/5 to-transparent opacity-0 blur-sm transition-opacity duration-500 group-hover:opacity-100 -z-10" />
              <div
                className={cn(
                  'relative flex h-full min-h-[168px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm',
                  'transition-all duration-300',
                  'hover:border-primary/35 hover:bg-card hover:shadow-md hover:shadow-primary/5',
                  'dark:border-white/10 dark:bg-[#0d1520]/85 dark:backdrop-blur-md dark:hover:border-primary/40 dark:hover:bg-[#0d1520]/95',
                )}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 via-primary/20 to-transparent opacity-80" />
                <div className="flex min-h-0 flex-1 flex-col p-5 pt-6">
                  <div className="flex shrink-0 gap-4">
                    <div className="relative shrink-0">
                      <div className="relative rounded-full p-0.5 ring-2 ring-primary/15 ring-offset-2 ring-offset-background transition-all duration-300 group-hover:ring-primary/30 dark:ring-offset-[#0d1520]">
                        <Avatar className="h-14 w-14 rounded-full border border-border/40 shadow-inner dark:border-white/10">
                          <AvatarImage src={c.avatar} alt={c.name} className="rounded-full object-cover" />
                          <AvatarFallback className="rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-base font-bold text-primary">
                            {c.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {isLoading && (
                          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-full bg-background/72 dark:bg-black/62">
                            <LoadingGif size="sm" className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h3 className="truncate text-[0.95rem] font-semibold leading-snug tracking-tight text-foreground">
                        {c.name}
                      </h3>
                      <div className="mt-2 flex items-start gap-1.5 text-muted-foreground">
                        <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                        <p className="line-clamp-2 text-[11px] leading-relaxed break-all sm:text-xs" title={c.email}>
                          {c.email}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto flex shrink-0 flex-col gap-2 border-t border-border/50 pt-4 dark:border-white/10">
                    <div
                      className="flex items-center gap-2 rounded-xl bg-muted/40 px-2.5 py-2 dark:bg-white/[0.06]"
                      title={c.departmentName || undefined}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border shadow-sm dark:bg-black/25"
                        style={(() => {
                          const color = normalizeColor(c.departmentColor);
                          return color
                            ? {
                                backgroundColor: `${color}18`,
                                borderColor: `${color}35`,
                                color,
                              }
                            : {
                                backgroundColor: 'rgba(255,255,255,0.08)',
                                borderColor: 'rgba(255,255,255,0.1)',
                                color: 'hsl(var(--primary))',
                              };
                        })()}
                      >
                        {c.departmentIcon
                          ? renderIcon(c.departmentIcon, 'h-3.5 w-3.5 rounded-full object-cover')
                          : <Building2 className="h-3.5 w-3.5" aria-hidden />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                          Departamento
                        </p>
                        <p className="truncate text-xs font-medium text-foreground">{c.departmentName || '—'}</p>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-2 rounded-xl bg-muted/40 px-2.5 py-2 dark:bg-white/[0.06]"
                      title={c.sectorName || undefined}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border shadow-sm dark:bg-black/25"
                        style={(() => {
                          const color = normalizeColor(c.sectorColor);
                          return color
                            ? {
                                backgroundColor: `${color}18`,
                                borderColor: `${color}35`,
                                color,
                              }
                            : {
                                backgroundColor: 'rgba(255,255,255,0.08)',
                                borderColor: 'rgba(255,255,255,0.1)',
                                color: 'hsl(var(--primary))',
                              };
                        })()}
                      >
                        {c.sectorIcon
                          ? renderIcon(c.sectorIcon, 'h-3.5 w-3.5 rounded-full object-cover')
                          : <Layers className="h-3.5 w-3.5" aria-hidden />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">Setor</p>
                        <p className="truncate text-xs font-medium text-foreground">{c.sectorName || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-2 font-medium">Nome</th>
            <th className="text-left py-3 px-2 font-medium">E-mail</th>
            <th className="text-left py-3 px-2 font-medium">Departamento</th>
            <th className="text-left py-3 px-2 font-medium">Setor</th>
          </tr>
        </thead>
        <tbody>
          {collaboratorRows.map((c) => {
            const isLoading = loadingCollaboratorId === c.id;
            return (
              <tr
                key={c.id}
                className="border-b border-border/50 hover:bg-muted/30 cursor-pointer"
                onClick={() => onCollaboratorClick?.(c)}
              >
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    <div className="relative shrink-0">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={c.avatar} alt={c.name} />
                        <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-semibold">
                          {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {isLoading && (
                        <div className="pointer-events-none absolute inset-[1px] rounded-full bg-black/55 flex items-center justify-center">
                          <LoadingGif size="sm" className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <span className="font-medium truncate">{c.name}</span>
                  </div>
                </td>
                <td className="py-2 px-2 text-muted-foreground max-w-[200px] truncate" title={c.email}>
                  {c.email}
                </td>
                <td className="py-2 px-2 text-muted-foreground max-w-[160px] truncate" title={c.departmentName}>
                  {c.departmentName || '—'}
                </td>
                <td className="py-2 px-2 text-muted-foreground max-w-[160px] truncate" title={c.sectorName}>
                  {c.sectorName || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
