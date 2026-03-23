import type { ElementType } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { Layers, UserCircle, Loader2, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingGifScreen } from '@/components/LoadingGif';
import type { TeamsViewMode, TeamCollaboratorPreview } from '@/components/teams/TeamsEnrichedView';
import type { NeonTeamCollaborator } from '@/services/corporateProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarGroup, AvatarGroupTooltip } from '@/components/ui/avatar-group';

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
              whileHover={{ y: -4, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } }}
              className="group relative cursor-pointer"
              onClick={() => onSectorClick?.(row)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10" />
              <div
                className="relative h-full flex flex-col p-5 rounded-2xl border border-white/5 bg-[#0d1520]/80 backdrop-blur-md transition-all duration-300 shadow-lg hover:border-primary/30 hover:bg-[#0d1520]/90 hover:shadow-primary/5"
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
                        <div key={c.id} className="relative">
                          <Avatar className="w-8 h-8 border-2 border-[#0d1520] ring-0 shadow-sm">
                            <AvatarImage src={c.avatar} alt={c.name} />
                            <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-semibold">
                              {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <AvatarGroupTooltip>{c.name}</AvatarGroupTooltip>
                        </div>
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
                  
                  {row.collaboratorCount > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5">
                      <span className="text-[11px] font-medium text-white/70">
                        {row.collaboratorCount}
                      </span>
                      <Users className="w-3.5 h-3.5 text-white/40" />
                    </div>
                  )}
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
                  className="border-b border-border/50 hover:bg-muted/30 cursor-pointer"
                  onClick={() => onSectorClick?.(row)}
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
      <Card className="border-border/50 bg-background/40">
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              whileHover={{ y: -4, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } }}
              className="group relative cursor-pointer"
              onClick={() => onCollaboratorClick?.(c)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10" />
              <div className="relative h-full flex flex-col p-5 rounded-2xl border border-white/5 bg-[#0d1520]/80 backdrop-blur-md transition-all duration-300 shadow-lg hover:border-primary/30 hover:bg-[#0d1520]/90 hover:shadow-primary/5">
                <div className="flex items-start gap-4 mb-3">
                  <div className="relative shrink-0">
                    <Avatar className="w-12 h-12 rounded-xl border border-white/10">
                      <AvatarImage src={c.avatar} alt={c.name} className="object-cover" />
                      <AvatarFallback className="rounded-xl bg-gradient-to-br from-white/10 to-white/5 text-primary font-bold text-base">
                        {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isLoading && (
                      <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-white tracking-tight truncate">{c.name}</h3>
                    <p className="text-xs text-muted-foreground/90 mt-1 truncate" title={c.email}>
                      {c.email}
                    </p>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground border-t border-white/5 pt-3 mt-auto">
                  <p className="truncate" title={c.departmentName}>
                    <span className="text-white/50">Departamento:</span> {c.departmentName || '—'}
                  </p>
                  <p className="truncate" title={c.sectorName}>
                    <span className="text-white/50">Setor:</span> {c.sectorName || '—'}
                  </p>
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
                        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
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
