import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { databaseService, supabase, type Team } from '@/services/supabase';
import { getDepartments, getDepartmentTeamStats, getNeonCollaboratorsForTeamDepartments, type NeonDepartment, type NeonTeamCollaborator } from '@/services/corporateProfile';
import { TeamsEnrichedView, type TeamDisplayRow, type TeamCollaboratorPreview, type TeamsViewMode } from '@/components/teams/TeamsEnrichedView';
import { AdminControlLine } from '@/admin/components/AdminControlLine';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminEquipesTopicView, type SectorTopicRow, type CollaboratorWithAvatar } from '@/admin/components/AdminEquipesTopicView';
import ProfileCardInfoPopup from '@/components/profile/ProfileCard/ProfileCardInfoPopup';
import { useAuthStore } from '@/store/authStore';

type EquipesTopicTab = 'departments' | 'sectors' | 'collaborators';
const TOPIC_DEPARTMENTS: EquipesTopicTab = 'departments';
const TOPIC_SECTORS: EquipesTopicTab = 'sectors';
const TOPIC_COLLABORATORS: EquipesTopicTab = 'collaborators';

function buildDisplayRows(
  teams: Team[],
  deptById: Map<string, NeonDepartment>,
  stats: Awaited<ReturnType<typeof getDepartmentTeamStats>>,
  collaboratorsByDeptId: Map<string, TeamCollaboratorPreview[]>,
): TeamDisplayRow[] {
  return teams.map((t) => {
    const neon = deptById.get(t.neonDepartmentId);
    const st = stats[t.neonDepartmentId] ?? { sectors: [], collaboratorCount: 0, sectorCounts: {} };
    return {
      id: t.id,
      status: t.status,
      name: neon?.name?.trim() || t.name,
      description: neon?.description ?? null,
      icon: neon?.icon ?? null,
      color: neon?.color ?? null,
      sectors: st.sectors,
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

  const searchPlaceholder =
    topicView === TOPIC_DEPARTMENTS
      ? 'Buscar departamentos…'
      : topicView === TOPIC_SECTORS
      ? 'Buscar setores…'
      : 'Buscar colaboradores…';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="w-8 h-8 shrink-0" />
          Equipes
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualize as equipes ativas liberadas no GêApps. Os dados de setores e colaboradores vêm do GêTeams (Neon).
        </p>
      </div>

      <AdminControlLine
        viewMode={viewMode}
        onViewModeChange={(m) => setViewMode(m as TeamsViewMode)}
        showViewToggle
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
          <Select value={topicView} onValueChange={(val) => setTopicView(val as EquipesTopicTab)}>
            <SelectTrigger className="h-9 w-[180px] rounded-xl border-border/60 bg-muted/50 text-sm font-medium shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus:ring-2 focus:ring-primary/20 focus:border-primary/40">
              <SelectValue placeholder="Visualização" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/60 bg-card/95 backdrop-blur-xl shadow-lg">
              <SelectItem value={TOPIC_DEPARTMENTS} className="rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors">
                Departamentos
              </SelectItem>
              <SelectItem value={TOPIC_SECTORS} className="rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors">
                Setores
              </SelectItem>
              <SelectItem value={TOPIC_COLLABORATORS} className="rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors">
                Colaboradores
              </SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {topicView === TOPIC_DEPARTMENTS ? (
        <TeamsEnrichedView
          loading={loading}
          rows={departmentRows}
          viewMode={viewMode}
          variant="user"
          showStatusColumn={false}
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
          emptyTitle={topicView === TOPIC_SECTORS ? 'Nenhum setor para exibir' : 'Nenhum colaborador para exibir'}
          emptyHint={searchQuery ? 'Tente ajustar a busca.' : 'Não há dados disponíveis para exibição.'}
        />
      )}

      <ProfileCardInfoPopup
        open={profilePopupOpen}
        onOpenChange={setProfilePopupOpen}
        userData={selectedProfileData}
        currentUser={currentUser}
      />
    </div>
  );
}
