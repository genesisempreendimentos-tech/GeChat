import type { ElementType } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { Layers, UserCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingGifScreen } from '@/components/LoadingGif';
import type { TeamsViewMode } from '@/components/teams/TeamsEnrichedView';
import type { NeonTeamCollaborator } from '@/services/corporateProfile';

export interface SectorTopicRow {
  id: string;
  sectorName: string;
  departmentName: string;
  collaboratorCount: number;
  icon: string | null;
  color: string | null;
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
  collaboratorRows: NeonTeamCollaborator[];
  emptyTitle: string;
  emptyHint: string;
}

export function AdminEquipesTopicView({
  variant,
  viewMode,
  loading,
  sectorRows,
  collaboratorRows,
  emptyTitle,
  emptyHint,
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
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10" />
              <div
                className="relative h-full flex flex-col p-5 rounded-2xl border border-white/5 bg-[#0d1520]/80 backdrop-blur-md transition-all duration-300 shadow-lg hover:border-primary/30 hover:bg-[#0d1520]/90 hover:shadow-primary/5 hover:-translate-y-2"
                style={
                  row.color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(row.color)
                    ? { borderLeftWidth: 4, borderLeftColor: row.color }
                    : undefined
                }
              >
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-amber-400 overflow-hidden shrink-0">
                    {row.icon ? (
                      renderIcon(row.icon, 'w-7 h-7 object-contain opacity-90')
                    ) : (
                      <Layers className="w-7 h-7 opacity-70" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-white tracking-tight truncate">{row.sectorName}</h3>
                    <p className="text-xs text-muted-foreground/90 mt-1 truncate" title={row.departmentName}>
                      {row.departmentName}
                    </p>
                  </div>
                </div>
                <div className="pt-4 mt-auto border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold text-white/90">{row.collaboratorCount}</span>
                  <span>colaborador{row.collaboratorCount === 1 ? '' : 'es'}</span>
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
            {sectorRows.map((row) => (
              <tr key={row.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-2 px-2 font-medium">{row.sectorName}</td>
                <td className="py-2 px-2 text-muted-foreground">{row.departmentName}</td>
                <td className="py-2 px-2 text-right tabular-nums font-medium">{row.collaboratorCount}</td>
              </tr>
            ))}
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
        {collaboratorRows.map((c, index) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10" />
            <div className="relative h-full flex flex-col p-5 rounded-2xl border border-white/5 bg-[#0d1520]/80 backdrop-blur-md transition-all duration-300 shadow-lg hover:border-primary/30 hover:bg-[#0d1520]/90 hover:shadow-primary/5 hover:-translate-y-2">
              <div className="flex items-start gap-4 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-primary shrink-0">
                  <UserCircle className="w-7 h-7 opacity-80" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-white tracking-tight truncate">{c.name}</h3>
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
        ))}
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
          {collaboratorRows.map((c) => (
            <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
              <td className="py-2 px-2 font-medium">{c.name}</td>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
