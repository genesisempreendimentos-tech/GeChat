import type { ElementType } from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Search, Users, Layers, Grid2x2, Shapes, LayoutGrid, Table2, UsersRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { databaseService, supabase, type Team } from '@/services/supabase';
import { getDepartments, getDepartmentTeamStats, getNeonCollaboratorsForTeamDepartments, type NeonDepartment, type NeonTeamCollaborator } from '@/services/corporateProfile';
import {
  TeamsEnrichedView,
  type TeamDisplayRow,
  type TeamCollaboratorPreview,
  type TeamSectorItem,
  type TeamsViewMode,
} from '@/components/teams/TeamsEnrichedView';
import { AdminControlLine } from '@/admin/components/AdminControlLine';
import { AdminEquipesTopicView, type SectorTopicRow, type CollaboratorWithAvatar } from '@/admin/components/AdminEquipesTopicView';
import ProfileCardInfoPopup from '@/components/profile/ProfileCard/ProfileCardInfoPopup';
import { useAuthStore } from '@/store/authStore';
import { TabButtons, type TabButtonItem } from '@/components/ui/tab-buttons';
import { MainViewHeader } from '@/components/layout/header';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { LoadingGif } from '@/components/LoadingGif';

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
  'bg-slate-500': '#64748b',
  'bg-gray-500': '#6b7280',
  'bg-zinc-500': '#71717a',
};

function normalizeSectorColor(color: string | null | undefined): string | null {
  if (!color) return null;
  const c = color.trim();
  if (SECTOR_COLOR_HEX_MAP[c]) return SECTOR_COLOR_HEX_MAP[c];
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(c)) return c;
  if (/^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(c)) return `#${c}`;
  return null;
}

function renderEquipesIcon(iconPath: string | null, className: string, Fallback: ElementType) {
  if (!iconPath) return <Fallback className={className} />;
  const isImg =
    iconPath.startsWith('http') ||
    iconPath.startsWith('/') ||
    /\.(svg|png|jpg|jpeg)$/i.test(iconPath);
  if (isImg) {
    return <img src={iconPath} alt="" className={className} />;
  }
  const IconComponent = (LucideIcons as unknown as Record<string, ElementType>)[iconPath] ?? Fallback;
  return <IconComponent className={className} />;
}

type EquipesCollaboratorsModal = { kind: 'department'; row: TeamDisplayRow } | { kind: 'sector'; row: SectorTopicRow };

type EquipesTopicTab = 'departments' | 'sectors' | 'collaborators';
const TOPIC_DEPARTMENTS: EquipesTopicTab = 'departments';
const TOPIC_SECTORS: EquipesTopicTab = 'sectors';
const TOPIC_COLLABORATORS: EquipesTopicTab = 'collaborators';
const TOPIC_TAB_ITEMS: ReadonlyArray<TabButtonItem<EquipesTopicTab>> = [
  { value: TOPIC_DEPARTMENTS, label: 'Departamentos', Icon: Grid2x2 },
  { value: TOPIC_SECTORS, label: 'Setores', Icon: Shapes },
  { value: TOPIC_COLLABORATORS, label: 'Colaboradores', Icon: Users },
];
const VIEW_TAB_ITEMS: ReadonlyArray<TabButtonItem<TeamsViewMode>> = [
  { value: 'table', label: 'Tabela', Icon: Table2 },
  { value: 'cards', label: 'Cards', Icon: LayoutGrid },
];

function buildDisplayRows(
  teams: Team[],
  deptById: Map<string, NeonDepartment>,
  stats: Awaited<ReturnType<typeof getDepartmentTeamStats>>,
  collaboratorsByDeptId: Map<string, TeamCollaboratorPreview[]>,
): TeamDisplayRow[] {
  return teams.map((t) => {
    const neon = deptById.get(t.neonDepartmentId);
    const st = stats[t.neonDepartmentId] ?? { sectors: [], collaboratorCount: 0, sectorCounts: {}, sectorIcons: {}, sectorColors: {} };
    const sectorIcons = st.sectorIcons ?? {};
    const sectorColors = st.sectorColors ?? {};
    const sectorItems: TeamSectorItem[] = st.sectors.map((name) => ({
      name,
      icon: sectorIcons[name] ?? null,
      color: sectorColors[name] ?? null,
    }));
    return {
      id: t.id,
      status: t.status,
      name: neon?.name?.trim() || t.name,
      description: neon?.description ?? null,
      icon: neon?.icon ?? null,
      color: neon?.color ?? null,
      sectors: st.sectors,
      sectorItems,
      collaboratorCount: st.collaboratorCount,
      collaborators: collaboratorsByDeptId.get(t.neonDepartmentId) ?? [],
    };
  });
}

export default function EquipesPage() {
  const { user: currentUser } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [topicView, setTopicView] = useState<EquipesTopicTab>(TOPIC_DEPARTMENTS);
  const [viewMode, setViewMode] = useState<TeamsViewMode>('cards');

  const [teams, setTeams] = useState<Team[]>([]);
  const [departments, setDepartments] = useState<NeonDepartment[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDepartmentTeamStats>>>({});
  const [collaboratorsByDeptId, setCollaboratorsByDeptId] = useState<Map<string, TeamCollaboratorPreview[]>>(new Map());
  const [collaboratorsWithAvatar, setCollaboratorsWithAvatar] = useState<CollaboratorWithAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const [selectedProfileData, setSelectedProfileData] = useState<any>(null);
  const [loadingCollaboratorId, setLoadingCollaboratorId] = useState<string | null>(null);
  const [collaboratorsModal, setCollaboratorsModal] = useState<EquipesCollaboratorsModal | null>(null);
  const [collaboratorsModalSearch, setCollaboratorsModalSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: teamsList } = await databaseService.listTeams({ activeOnly: true });
    const deptList = await getDepartments();
    const ids = teamsList.map((x) => x.neonDepartmentId);
    const statsMap = await getDepartmentTeamStats(ids);

    // Buscar colaboradores do Neon e cruzar com perfis do Supabase para obter avatares
    const neonCollaborators: NeonTeamCollaborator[] = await getNeonCollaboratorsForTeamDepartments(ids);
    const collabMap = new Map<string, TeamCollaboratorPreview[]>();
    if (neonCollaborators.length > 0) {
      const emails = [...new Set(neonCollaborators.map((c) => c.email.toLowerCase()).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, name, email, avatar_url, avatar')
        .in('email', emails);
      const profileByEmail = new Map<string, { id: string; name: string; avatar?: string }>();
      if (profiles) {
        for (const p of profiles) {
          const email = (p.email ?? '').toLowerCase();
          if (email) {
            profileByEmail.set(email, {
              id: p.user_id ?? email,
              name: (p.full_name ?? p.name ?? '').toString(),
              avatar: p.avatar_url ?? p.avatar ?? undefined,
            });
          }
        }
      }
      for (const c of neonCollaborators) {
        const deptId = c.neonDepartmentId;
        const profile = profileByEmail.get(c.email.toLowerCase());
        const preview: TeamCollaboratorPreview = {
          id: profile?.id ?? c.id,
          name: profile?.name || c.name,
          email: c.email,
          avatar: profile?.avatar,
        };
        const list = collabMap.get(deptId) ?? [];
        list.push(preview);
        collabMap.set(deptId, list);
      }
    }

    const enriched: CollaboratorWithAvatar[] = neonCollaborators.map((c) => {
      const profile = collabMap
        .get(c.neonDepartmentId)
        ?.find((p) => p.email.toLowerCase() === c.email.toLowerCase());
      const dept = deptList.find((d) => d.id === c.neonDepartmentId);
      const st = statsMap[c.neonDepartmentId];
      const sectorNorm = c.sectorName.trim().toLowerCase();
      const matchingSectorName =
        st?.sectors?.find((s) => s.trim().toLowerCase() === sectorNorm) ?? c.sectorName;
      return {
        ...c,
        avatar: profile?.avatar,
        departmentIcon: dept?.icon ?? null,
        departmentColor: dept?.color ?? null,
        sectorIcon: st?.sectorIcons?.[matchingSectorName] ?? null,
        sectorColor: st?.sectorColors?.[matchingSectorName] ?? null,
      };
    });

    setTeams(teamsList);
    setDepartments(deptList);
    setStats(statsMap);
    setCollaboratorsByDeptId(collabMap);
    setCollaboratorsWithAvatar(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const displayRowsAll = useMemo(
    () => buildDisplayRows(teams, deptById, stats, collaboratorsByDeptId),
    [teams, deptById, stats, collaboratorsByDeptId],
  );

  const departmentRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return displayRowsAll.filter((row) => {
      return (
        !q ||
        row.name.toLowerCase().includes(q) ||
        (row.description ?? '').toLowerCase().includes(q) ||
        row.sectors.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [displayRowsAll, searchQuery]);

  const sectorRows = useMemo((): SectorTopicRow[] => {
    const rows: SectorTopicRow[] = [];
    for (const t of teams) {
      const neon = deptById.get(t.neonDepartmentId);
      const st = stats[t.neonDepartmentId];
      if (!st?.sectors?.length) continue;
      const deptName = neon?.name?.trim() || t.name;
      for (const s of st.sectors) {
        const sectorCollabs = collaboratorsWithAvatar
          .filter(
            (c) =>
              c.neonDepartmentId === t.neonDepartmentId &&
              c.sectorName.trim().toLowerCase() === s.trim().toLowerCase(),
          )
          .map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            avatar: c.avatar,
          }));
        rows.push({
          id: `${t.id}::${s}`,
          teamId: t.id,
          neonDepartmentId: t.neonDepartmentId,
          sectorName: s,
          departmentName: deptName,
          collaboratorCount: st.sectorCounts[s] ?? 0,
          icon: st.sectorIcons?.[s] ?? null,
          color: st.sectorColors?.[s] ?? null,
          collaborators: sectorCollabs,
        });
      }
    }
    const q = searchQuery.trim().toLowerCase();
    return rows
      .filter((row) => !q || row.sectorName.toLowerCase().includes(q) || row.departmentName.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          a.sectorName.localeCompare(b.sectorName, 'pt-BR') ||
          a.departmentName.localeCompare(b.departmentName, 'pt-BR'),
      );
  }, [teams, deptById, stats, collaboratorsWithAvatar, searchQuery]);

  const collaboratorRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return collaboratorsWithAvatar.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.departmentName.toLowerCase().includes(q) ||
        c.sectorName.toLowerCase().includes(q)
      );
    });
  }, [collaboratorsWithAvatar, searchQuery]);

  const handleCollaboratorClick = useCallback(async (collab: CollaboratorWithAvatar) => {
    setLoadingCollaboratorId(collab.id);
    const { data } = await databaseService.getProfileForPopupByEmail(collab.email);
    setLoadingCollaboratorId(null);
    if (data) {
      setSelectedProfileData(data);
      setProfilePopupOpen(true);
      return;
    }
    setSelectedProfileData({
      full_name: collab.name,
      email: collab.email,
      avatar_url: collab.avatar,
      profession: collab.sectorName || collab.departmentName,
      birth_date: collab.birthDate || null,
      hire_date: collab.hireDate || null,
    });
    setProfilePopupOpen(true);
  }, []);

  const openCollaboratorsModalDepartment = useCallback((row: TeamDisplayRow) => {
    setCollaboratorsModalSearch('');
    setCollaboratorsModal({ kind: 'department', row });
  }, []);

  const openCollaboratorsModalSector = useCallback((row: SectorTopicRow) => {
    setCollaboratorsModalSearch('');
    setCollaboratorsModal({ kind: 'sector', row });
  }, []);

  const collaboratorsModalMeta = useMemo(() => {
    if (!collaboratorsModal) {
      return {
        kind: 'department' as const,
        title: '',
        description: '',
        icon: null as string | null,
        sectorColor: null as string | null,
        collaborators: [] as TeamCollaboratorPreview[],
      };
    }
    if (collaboratorsModal.kind === 'department') {
      const r = collaboratorsModal.row;
      const description =
        r.description?.trim() ||
        (r.sectors.length ? `Setores: ${r.sectors.join(', ')}` : 'Sem descrição cadastrada.');
      return {
        kind: 'department' as const,
        title: r.name,
        description,
        icon: r.icon,
        sectorColor: null as string | null,
        collaborators: r.collaborators ?? [],
      };
    }
    const r = collaboratorsModal.row;
    return {
      kind: 'sector' as const,
      title: r.sectorName,
      description: `Departamento: ${r.departmentName}`,
      icon: r.icon,
      sectorColor: r.color,
      collaborators: r.collaborators ?? [],
    };
  }, [collaboratorsModal]);

  const filteredModalCollaborators = useMemo(() => {
    const q = collaboratorsModalSearch.trim().toLowerCase();
    return collaboratorsModalMeta.collaborators.filter(
      (c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    );
  }, [collaboratorsModalMeta.collaborators, collaboratorsModalSearch]);

  const neonDeptIdForModal = useMemo(() => {
    if (!collaboratorsModal) return '';
    if (collaboratorsModal.kind === 'sector') return collaboratorsModal.row.neonDepartmentId;
    const t = teams.find((x) => x.id === collaboratorsModal.row.id);
    return t?.neonDepartmentId ?? '';
  }, [collaboratorsModal, teams]);

  const profileContextForModal = useMemo(() => {
    if (!collaboratorsModal) return { departmentName: '', sectorName: '' };
    if (collaboratorsModal.kind === 'department') {
      const r = collaboratorsModal.row;
      return {
        departmentName: r.name,
        sectorName: r.sectors.length ? r.sectors.join(', ') : '—',
      };
    }
    const r = collaboratorsModal.row;
    return { departmentName: r.departmentName, sectorName: r.sectorName };
  }, [collaboratorsModal]);

  const handleModalCollaboratorClick = useCallback(
    (c: TeamCollaboratorPreview) => {
      const collab: CollaboratorWithAvatar = {
        id: c.id,
        name: c.name,
        email: c.email,
        departmentName: profileContextForModal.departmentName,
        sectorName: profileContextForModal.sectorName,
        neonDepartmentId: neonDeptIdForModal,
        avatar: c.avatar,
      };
      void handleCollaboratorClick(collab);
    },
    [handleCollaboratorClick, neonDeptIdForModal, profileContextForModal.departmentName, profileContextForModal.sectorName],
  );

  const handleDepartmentCardCollaboratorClick = useCallback(
    (c: TeamCollaboratorPreview, row: TeamDisplayRow) => {
      const neonDepartmentId = teams.find((x) => x.id === row.id)?.neonDepartmentId ?? '';
      const collab: CollaboratorWithAvatar = {
        id: c.id,
        name: c.name,
        email: c.email,
        departmentName: row.name,
        sectorName: row.sectors.length ? row.sectors.join(', ') : '—',
        neonDepartmentId,
        avatar: c.avatar,
      };
      void handleCollaboratorClick(collab);
    },
    [handleCollaboratorClick, teams],
  );

  const handleSectorCardCollaboratorClick = useCallback(
    (c: TeamCollaboratorPreview, row: SectorTopicRow) => {
      const collab: CollaboratorWithAvatar = {
        id: c.id,
        name: c.name,
        email: c.email,
        departmentName: row.departmentName,
        sectorName: row.sectorName,
        neonDepartmentId: row.neonDepartmentId,
        avatar: c.avatar,
      };
      void handleCollaboratorClick(collab);
    },
    [handleCollaboratorClick],
  );

  const searchPlaceholder =
    topicView === TOPIC_DEPARTMENTS
      ? 'Buscar departamentos…'
      : topicView === TOPIC_SECTORS
      ? 'Buscar setores…'
      : 'Buscar colaboradores…';

  return (
    <MainViewFluidShell>
    <div className="space-y-6">
      <MainViewHeader
        icon={<UsersRound className="h-6 w-6" />}
        title="Equipes"
        description="Visualize todas as equipes da empresa em departamentos, setores e colaboradores."
      />

      <AdminControlLine
        viewMode={viewMode}
        onViewModeChange={(m) => setViewMode(m as TeamsViewMode)}
        showViewToggle={false}
        leftContent={
          <TabButtons<EquipesTopicTab>
            value={topicView}
            items={TOPIC_TAB_ITEMS}
            onChange={setTopicView}
          />
        }
        centerContent={
          <div className="relative group/search w-full max-w-3xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors duration-200" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-8 w-full h-9 rounded-xl border-border/60 bg-muted/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        }
        rightContent={
          <TabButtons<TeamsViewMode>
            value={viewMode}
            items={VIEW_TAB_ITEMS}
            onChange={setViewMode}
          />
        }
      />

      {topicView === TOPIC_DEPARTMENTS ? (
        <TeamsEnrichedView
          loading={loading}
          rows={departmentRows}
          viewMode={viewMode}
          variant="user"
          showStatusColumn={false}
          onCardClick={openCollaboratorsModalDepartment}
          onCollaboratorBadgeClick={openCollaboratorsModalDepartment}
          onCollaboratorPreviewClick={handleDepartmentCardCollaboratorClick}
          loadingCollaboratorId={loadingCollaboratorId}
          emptyTitle="Nenhuma equipe para exibir"
          emptyHint={
            searchQuery
              ? 'Tente ajustar a busca.'
              : 'Ainda não há equipes ativas. O administrador pode cadastrá-las no painel admin.'
          }
        />
      ) : (
        <AdminEquipesTopicView
          variant={topicView === TOPIC_SECTORS ? 'sectors' : 'collaborators'}
          viewMode={viewMode}
          loading={loading}
          sectorRows={sectorRows}
          collaboratorRows={collaboratorRows}
          onCollaboratorClick={handleCollaboratorClick}
          loadingCollaboratorId={loadingCollaboratorId}
          onSectorClick={topicView === TOPIC_SECTORS ? openCollaboratorsModalSector : undefined}
          onSectorCollaboratorBadgeClick={topicView === TOPIC_SECTORS ? openCollaboratorsModalSector : undefined}
          onSectorCollaboratorPreviewClick={topicView === TOPIC_SECTORS ? handleSectorCardCollaboratorClick : undefined}
          emptyTitle={topicView === TOPIC_SECTORS ? 'Nenhum setor para exibir' : 'Nenhum colaborador para exibir'}
          emptyHint={searchQuery ? 'Tente ajustar a busca.' : 'Não há dados disponíveis para exibição.'}
        />
      )}

      <Dialog
        open={!!collaboratorsModal}
        onOpenChange={(open) => {
          if (!open) {
            setCollaboratorsModal(null);
            setCollaboratorsModalSearch('');
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden sm:max-w-lg">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0 space-y-0 text-left">
            <div className="flex items-start gap-4 pr-8">
              {collaboratorsModalMeta.kind === 'sector' && normalizeSectorColor(collaboratorsModalMeta.sectorColor) ? (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border shadow-sm"
                  style={{
                    backgroundColor: `${normalizeSectorColor(collaboratorsModalMeta.sectorColor)!}15`,
                    borderColor: `${normalizeSectorColor(collaboratorsModalMeta.sectorColor)!}30`,
                    color: normalizeSectorColor(collaboratorsModalMeta.sectorColor)!,
                  }}
                >
                  {renderEquipesIcon(collaboratorsModalMeta.icon, 'w-6 h-6 object-contain opacity-90', Layers)}
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 overflow-hidden">
                  {renderEquipesIcon(collaboratorsModalMeta.icon, 'w-7 h-7 object-contain', Users)}
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <DialogTitle className="text-lg font-semibold leading-tight tracking-tight">
                  {collaboratorsModalMeta.title}
                </DialogTitle>
                <DialogDescription className="text-sm leading-snug">
                  {collaboratorsModalMeta.description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 pt-4 shrink-0">
            <div className="relative group/search w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within/search:text-primary transition-colors" />
              <Input
                placeholder="Buscar colaborador…"
                className="pl-9 h-10 rounded-xl bg-background/50 border-border/60 shadow-sm w-full"
                value={collaboratorsModalSearch}
                onChange={(e) => setCollaboratorsModalSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            {filteredModalCollaborators.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground font-medium px-4">
                  {collaboratorsModalMeta.collaborators.length === 0
                    ? 'Nenhum colaborador listado aqui.'
                    : 'Nenhum colaborador encontrado para a busca.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 pb-2">
                {filteredModalCollaborators.map((c) => (
                  <button
                    key={`${c.id}-${c.email}`}
                    type="button"
                    onClick={() => handleModalCollaboratorClick(c)}
                    disabled={loadingCollaboratorId === c.id}
                    className="w-full flex items-center gap-4 p-3 rounded-2xl border border-border/40 bg-muted/10 hover:bg-muted/25 hover:border-border/60 transition-colors duration-200 text-left disabled:opacity-70"
                  >
                    <Avatar className="w-10 h-10 border border-border/50 shrink-0">
                      <AvatarImage src={c.avatar} alt={c.name} />
                      <AvatarFallback className="text-xs bg-primary/15 text-primary font-semibold">
                        {c.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </div>
                    {loadingCollaboratorId === c.id ? (
                      <LoadingGif size="sm" className="shrink-0" />
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ProfileCardInfoPopup
        open={profilePopupOpen}
        onOpenChange={setProfilePopupOpen}
        userData={selectedProfileData}
        currentUser={currentUser}
      />
    </div>
    </MainViewFluidShell>
  );
}
