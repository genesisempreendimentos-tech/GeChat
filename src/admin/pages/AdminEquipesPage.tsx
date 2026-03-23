import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Users, RefreshCw, AlertCircle, Building2, Loader2, Check, Unlock, LayoutGrid, Layers } from 'lucide-react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AdminPageHeader } from '@/admin/components/AdminPageHeader';
import { AdminControlLine, type ViewMode } from '@/admin/components/AdminControlLine';
import { AdminBigBox } from '@/admin/components/AdminBigBox';
import {
  getDepartments,
  getDepartmentTeamStats,
  getNeonCollaboratorsForTeamDepartments,
  type NeonDepartment,
  type NeonTeamCollaborator,
} from '@/services/corporateProfile';
import { databaseService, supabase, type Team, type TeamLifecycleStatus } from '@/services/supabase';
import { toast } from 'sonner';
import { LoadingGif } from '@/components/LoadingGif';
import { TeamsEnrichedView, type TeamDisplayRow, type TeamCollaboratorPreview } from '@/components/teams/TeamsEnrichedView';
import { AdminEquipesTopicView, type SectorTopicRow, type CollaboratorWithAvatar } from '@/admin/components/AdminEquipesTopicView';
import ProfileCardInfoPopup from '@/components/profile/ProfileCard/ProfileCardInfoPopup';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

type EquipesTopicTab = 'departments' | 'sectors' | 'collaborators';

function renderSystemIcon(iconPath: string, className = '') {
  const isImg =
    iconPath?.startsWith('http') ||
    iconPath?.startsWith('/') ||
    /\.(svg|png|jpg|jpeg)$/i.test(iconPath ?? '');
  if (isImg && iconPath) return <img src={iconPath} alt="" className={className} />;
  const IconComponent = (Icons as any)[iconPath] ?? Icons.Boxes;
  return <IconComponent className={className} />;
}

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

export default function AdminEquipesPage() {
  const { user: currentUser } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [topicView, setTopicView] = useState<EquipesTopicTab>(TOPIC_DEPARTMENTS);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  const [teams, setTeams] = useState<Team[]>([]);
  const [departments, setDepartments] = useState<NeonDepartment[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDepartmentTeamStats>>>({});
  const [collaborators, setCollaborators] = useState<NeonTeamCollaborator[]>([]);
  const [collaboratorsByDeptId, setCollaboratorsByDeptId] = useState<Map<string, TeamCollaboratorPreview[]>>(new Map());
  const [collaboratorsWithAvatar, setCollaboratorsWithAvatar] = useState<CollaboratorWithAvatar[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [pendingStatusTeamId, setPendingStatusTeamId] = useState<string | null>(null);

  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const [selectedProfileData, setSelectedProfileData] = useState<any>(null);
  const [loadingCollaboratorId, setLoadingCollaboratorId] = useState<string | null>(null);

  // Modal de departamento — acesso a sistemas
  const [deptModalRow, setDeptModalRow] = useState<TeamDisplayRow | null>(null);
  const [deptModalSystems, setDeptModalSystems] = useState<Array<{
    id: string; name: string; icon: string; status?: string;
    canAccess: boolean; original: boolean;
  }>>([]);
  const [deptModalLoading, setDeptModalLoading] = useState(false);
  const [deptModalSaving, setDeptModalSaving] = useState(false);
  const [deptSystemSearch, setDeptSystemSearch] = useState('');
  const [deptSystemFilter, setDeptSystemFilter] = useState<'all' | 'granted' | 'denied'>('all');

  // Modal de setor — acesso a sistemas (apenas colaboradores daquele setor)
  const [sectorModalRow, setSectorModalRow] = useState<SectorTopicRow | null>(null);
  const [sectorModalSystems, setSectorModalSystems] = useState<Array<{
    id: string; name: string; icon: string; status?: string;
    canAccess: boolean; original: boolean;
  }>>([]);
  const [sectorModalLoading, setSectorModalLoading] = useState(false);
  const [sectorModalSaving, setSectorModalSaving] = useState(false);
  const [sectorSystemSearch, setSectorSystemSearch] = useState('');
  const [sectorSystemFilter, setSectorSystemFilter] = useState<'all' | 'granted' | 'denied'>('all');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [modalDepartments, setModalDepartments] = useState<NeonDepartment[]>([]);
  const [depsLoading, setDepsLoading] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const selectedDept = modalDepartments.find((d) => d.id === selectedDeptId) ?? null;

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const loadTeamsView = useCallback(async () => {
    setListLoading(true);
    const { data: teamsList } = await databaseService.listTeams();
    const deptList = await getDepartments();
    const ids = teamsList.map((x) => x.neonDepartmentId);
    const statsMap = await getDepartmentTeamStats(ids);
    const collabList = ids.length ? await getNeonCollaboratorsForTeamDepartments(ids) : [];

    // Cruzar emails com profiles do Supabase para obter avatares
    const collabMap = new Map<string, TeamCollaboratorPreview[]>();
    if (collabList.length > 0) {
      const emails = [...new Set(collabList.map((c) => c.email.toLowerCase()).filter(Boolean))];
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
      for (const c of collabList) {
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

    // Montar lista de colaboradores enriquecidos com avatar para a view de colaboradores
    const enriched: CollaboratorWithAvatar[] = collabList.map((c) => {
      const profile = collabMap.get(c.neonDepartmentId)?.find(
        (p) => p.email.toLowerCase() === c.email.toLowerCase(),
      );
      return { ...c, avatar: profile?.avatar };
    });

    setTeams(teamsList);
    setDepartments(deptList);
    setStats(statsMap);
    setCollaborators(collabList);
    setCollaboratorsByDeptId(collabMap);
    setCollaboratorsWithAvatar(enriched);
    setListLoading(false);
  }, []);

  useEffect(() => {
    loadTeamsView();
  }, [loadTeamsView]);

  const resetForm = () => {
    setSelectedDeptId('');
    setFormError('');
  };

  const openCreate = async () => {
    resetForm();
    setIsCreateOpen(true);
    setDepsLoading(true);
    const deps = await getDepartments();
    setModalDepartments(deps);
    setDepsLoading(false);
  };

  const handleCreateEquipe = async () => {
    setFormError('');
    if (!selectedDept) {
      setFormError('Selecione um departamento.');
      return;
    }
    setFormLoading(true);
    const { data, error } = await databaseService.createTeam({
      name: selectedDept.name.trim(),
      neon_department_id: selectedDept.id,
      status: 'active',
    });
    setFormLoading(false);
    if (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: string }).code) : '';
      if (code === '23505') {
        setFormError('Este departamento já está cadastrado como equipe.');
        return;
      }
      const msg =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: string }).message)
          : 'Erro ao criar equipe. Verifique a tabela teams e as políticas RLS no Supabase.';
      setFormError(msg);
      return;
    }
    if (data) {
      setIsCreateOpen(false);
      resetForm();
      await loadTeamsView();
    }
  };

  const handleTeamStatusChange = async (teamId: string, status: TeamLifecycleStatus) => {
    setPendingStatusTeamId(teamId);
    const { error } = await databaseService.updateTeamStatus(teamId, status);
    setPendingStatusTeamId(null);
    if (error) {
      const msg =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: string }).message)
          : 'Não foi possível atualizar o status.';
      toast.error(msg);
      return;
    }
    toast.success(
      status === 'active' ? 'Equipe ativa.' : status === 'archived' ? 'Equipe arquivada.' : 'Equipe excluída.',
    );
    await loadTeamsView();
  };

  const displayRowsAll = useMemo(
    () => buildDisplayRows(teams, deptById, stats, collaboratorsByDeptId),
    [teams, deptById, stats, collaboratorsByDeptId],
  );

  const sectorTopicRows = useMemo((): SectorTopicRow[] => {
    const rows: SectorTopicRow[] = [];
    for (const t of teams) {
      const neon = deptById.get(t.neonDepartmentId);
      const st = stats[t.neonDepartmentId];
      if (!st?.sectors?.length) continue;
      const deptName = neon?.name?.trim() || t.name;
      for (const s of st.sectors) {
        // Colaboradores deste setor específico
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
    return rows.sort(
      (a, b) =>
        a.sectorName.localeCompare(b.sectorName, 'pt-BR') ||
        a.departmentName.localeCompare(b.departmentName, 'pt-BR'),
    );
  }, [teams, deptById, stats, collaboratorsWithAvatar]);

  const filteredDepartmentRows = useMemo(() => {
    const qq = searchQuery.trim().toLowerCase();
    return displayRowsAll.filter((row) => {
      if (!qq) return true;
      return (
        row.name.toLowerCase().includes(qq) || (row.description ?? '').toLowerCase().includes(qq)
      );
    });
  }, [displayRowsAll, searchQuery]);

  const filteredSectorRows = useMemo(() => {
    const qq = searchQuery.trim().toLowerCase();
    return sectorTopicRows.filter((row) => {
      if (!qq) return true;
      return (
        row.sectorName.toLowerCase().includes(qq) || row.departmentName.toLowerCase().includes(qq)
      );
    });
  }, [sectorTopicRows, searchQuery]);

  const filteredCollaboratorRows = useMemo(() => {
    const qq = searchQuery.trim().toLowerCase();
    return collaboratorsWithAvatar.filter((c) => {
      if (!qq) return true;
      return (
        c.name.toLowerCase().includes(qq) ||
        c.email.toLowerCase().includes(qq) ||
        c.departmentName.toLowerCase().includes(qq) ||
        c.sectorName.toLowerCase().includes(qq)
      );
    });
  }, [collaboratorsWithAvatar, searchQuery]);

  const handleDeptCardClick = useCallback(async (row: TeamDisplayRow) => {
    setDeptModalRow(row);
    setDeptSystemSearch('');
    setDeptSystemFilter('all');
    setDeptModalLoading(true);

    // Busca todos os sistemas e verifica quais os colaboradores do dept têm acesso
    const { data: allSystems } = await databaseService.getSystems();
    const collabs = collaboratorsWithAvatar.filter((c) => {
      // Encontra o team correspondente ao row
      const team = teams.find((t) => t.id === row.id);
      return team && c.neonDepartmentId === team.neonDepartmentId;
    });

    if (!allSystems?.length) {
      setDeptModalSystems([]);
      setDeptModalLoading(false);
      return;
    }

    // Para cada sistema, verifica se TODOS os colaboradores do dept têm acesso
    const systemAccessResults = await Promise.all(
      allSystems.map(async (sys: any) => {
        const { data: usersWithAccess } = await databaseService.getUsersWithAccessToApp(sys.id);
        const accessIds = new Set((usersWithAccess ?? []).map((u: any) => u.id));
        // Considera "com acesso" se pelo menos 1 colaborador do dept tem acesso
        const anyHasAccess = collabs.some((c) => {
          // Tenta encontrar o profile pelo email para ter o user_id
          const preview = collaboratorsByDeptId.get(
            teams.find((t) => t.id === row.id)?.neonDepartmentId ?? ''
          )?.find((p) => p.email.toLowerCase() === c.email.toLowerCase());
          return preview && accessIds.has(preview.id);
        });
        return {
          id: sys.id,
          name: sys.name,
          icon: sys.icon ?? '',
          status: sys.status,
          canAccess: anyHasAccess,
          original: anyHasAccess,
        };
      })
    );

    setDeptModalSystems(systemAccessResults);
    setDeptModalLoading(false);
  }, [collaboratorsWithAvatar, collaboratorsByDeptId, teams]);

  const handleSaveDeptAccess = useCallback(async () => {
    if (!deptModalRow) return;
    setDeptModalSaving(true);

    const team = teams.find((t) => t.id === deptModalRow.id);
    const deptId = team?.neonDepartmentId ?? '';
    const collabPreviews = collaboratorsByDeptId.get(deptId) ?? [];
    const changed = deptModalSystems.filter((s) => s.canAccess !== s.original);

    await Promise.all(
      changed.flatMap((sys) =>
        collabPreviews.map((collab) =>
          databaseService.setUserSystemAccess(collab.id, sys.id, sys.canAccess)
        )
      )
    );

    setDeptModalSystems((prev) =>
      prev.map((s) => ({ ...s, original: s.canAccess }))
    );
    setDeptModalSaving(false);
    toast.success('Acessos do departamento atualizados.');
  }, [deptModalRow, deptModalSystems, collaboratorsByDeptId, teams]);

  const handleSectorClick = useCallback(
    async (sector: SectorTopicRow) => {
      setSectorModalRow(sector);
      setSectorSystemSearch('');
      setSectorSystemFilter('all');
      setSectorModalLoading(true);

      const { data: allSystems } = await databaseService.getSystems();
      const sectorNorm = sector.sectorName.trim().toLowerCase();
      const collabs = collaboratorsWithAvatar.filter(
        (c) =>
          c.neonDepartmentId === sector.neonDepartmentId &&
          c.sectorName.trim().toLowerCase() === sectorNorm,
      );

      if (!allSystems?.length) {
        setSectorModalSystems([]);
        setSectorModalLoading(false);
        return;
      }

      const neonDeptId = sector.neonDepartmentId;
      const previewsInDept = collaboratorsByDeptId.get(neonDeptId) ?? [];

      const systemAccessResults = await Promise.all(
        allSystems.map(async (sys: any) => {
          const { data: usersWithAccess } = await databaseService.getUsersWithAccessToApp(sys.id);
          const accessIds = new Set((usersWithAccess ?? []).map((u: any) => u.id));
          const anyHasAccess = collabs.some((c) => {
            const preview = previewsInDept.find(
              (p) => p.email.toLowerCase() === c.email.toLowerCase(),
            );
            return preview && accessIds.has(preview.id);
          });
          return {
            id: sys.id,
            name: sys.name,
            icon: sys.icon ?? '',
            status: sys.status,
            canAccess: anyHasAccess,
            original: anyHasAccess,
          };
        }),
      );

      setSectorModalSystems(systemAccessResults);
      setSectorModalLoading(false);
    },
    [collaboratorsWithAvatar, collaboratorsByDeptId],
  );

  const handleSaveSectorAccess = useCallback(async () => {
    if (!sectorModalRow) return;
    setSectorModalSaving(true);

    const previews = sectorModalRow.collaborators ?? [];
    const changed = sectorModalSystems.filter((s) => s.canAccess !== s.original);

    await Promise.all(
      changed.flatMap((sys) =>
        previews.map((collab) =>
          databaseService.setUserSystemAccess(collab.id, sys.id, sys.canAccess),
        ),
      ),
    );

    setSectorModalSystems((prev) => prev.map((s) => ({ ...s, original: s.canAccess })));
    setSectorModalSaving(false);
    toast.success('Acessos do setor atualizados.');
  }, [sectorModalRow, sectorModalSystems]);

  const handleCollaboratorClick = useCallback(async (collab: CollaboratorWithAvatar) => {
    setLoadingCollaboratorId(collab.id);
    const { data } = await databaseService.getRawProfileByEmail(collab.email);
    setLoadingCollaboratorId(null);
    if (data) {
      setSelectedProfileData(data);
      setProfilePopupOpen(true);
    } else {
      // Colaborador não tem perfil no GêApps ainda — mostra dados básicos do Neon
      setSelectedProfileData({
        full_name: collab.name,
        email: collab.email,
        avatar_url: collab.avatar,
        profession: collab.sectorName || collab.departmentName,
      });
      setProfilePopupOpen(true);
    }
  }, []);

  const searchPlaceholder =
    topicView === TOPIC_DEPARTMENTS
      ? 'Buscar departamentos…'
      : topicView === TOPIC_SECTORS
        ? 'Buscar setores…'
        : 'Buscar colaboradores…';

  const topicLabel =
    topicView === TOPIC_DEPARTMENTS
      ? 'Departamentos'
      : topicView === TOPIC_SECTORS
        ? 'Setores'
        : 'Colaboradores';

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Users}
        title="Equipes"
        description="Cadastre equipes e defina quem pode vê-las no GeApps. Esta tela é exclusiva do painel administrativo."
        action={
          <Button type="button" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Equipes
          </Button>
        }
      />

      <AdminControlLine
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showViewToggle
        leftContent={
          <div className="relative group/search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors duration-200" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-8 w-56 sm:w-72 h-9 rounded-xl border-border/60 bg-muted/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        }
        rightContent={
          <Select
            value={topicView}
            onValueChange={(val) => setTopicView(val as EquipesTopicTab)}
          >
            <SelectTrigger className="h-9 w-[180px] rounded-xl border-border/60 bg-muted/50 text-sm font-medium shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus:ring-2 focus:ring-primary/20 focus:border-primary/40">
              <SelectValue placeholder="Selecione a visualização" />
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

      <AdminBigBox>
        {topicView === TOPIC_DEPARTMENTS ? (
          <TeamsEnrichedView
            loading={listLoading}
            rows={filteredDepartmentRows}
            viewMode={viewMode}
            variant="admin"
            showStatusColumn
            showAdminActions
            onTeamStatusChange={handleTeamStatusChange}
            pendingTeamId={pendingStatusTeamId}
            onCardClick={handleDeptCardClick}
            emptyTitle="Nenhuma equipe encontrada"
            emptyHint={
              teams.length === 0
                ? 'Use Adicionar Equipes para vincular um departamento do GêTeams. Confira se a tabela teams existe no Supabase e se as políticas RLS permitem leitura para appsadmin.'
                : 'Tente ajustar a busca.'
            }
          />
        ) : (
          <AdminEquipesTopicView
            variant={topicView === TOPIC_SECTORS ? 'sectors' : 'collaborators'}
            viewMode={viewMode}
            loading={listLoading}
            sectorRows={filteredSectorRows}
            collaboratorRows={filteredCollaboratorRows}
            onSectorClick={handleSectorClick}
            onCollaboratorClick={handleCollaboratorClick}
            loadingCollaboratorId={loadingCollaboratorId}
            emptyTitle={
              topicView === TOPIC_SECTORS ? 'Nenhum setor para exibir' : 'Nenhum colaborador para exibir'
            }
            emptyHint={
              teams.length === 0
                ? 'Cadastre equipes (departamentos) para carregar setores e colaboradores do GêTeams.'
                : topicView === TOPIC_SECTORS
                  ? 'Não há setores associados aos departamentos das equipes ou a busca não encontrou resultados.'
                  : 'Não há colaboradores ativos ligados a esses departamentos no Neon ou a busca não encontrou resultados.'
            }
          />
        )}
      </AdminBigBox>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-[520px] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl">
          <div className="relative overflow-hidden border-b border-border/40 px-6 pt-6 pb-5 shrink-0">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-violet-500/[0.06]"
              aria-hidden
            />
            <DialogHeader className="relative text-left space-y-3">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0 shadow-sm">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-1 pt-0.5 min-w-0">
                  <DialogTitle className="text-xl font-semibold tracking-tight">Nova equipe</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                    Escolha o departamento no GêTeams para ser exibido no GêApps.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-3 text-sm text-destructive bg-destructive/[0.08] px-4 py-3 rounded-2xl border border-destructive/20"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="leading-snug">{formError}</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="equipes-dept-select-trigger"
                  className="text-sm font-semibold text-foreground flex items-center gap-2"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="w-3.5 h-3.5" />
                  </span>
                  Departamento
                  <span className="text-destructive font-bold">*</span>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    setDepsLoading(true);
                    const deps = await getDepartments();
                    setModalDepartments(deps);
                    setDepsLoading(false);
                  }}
                  disabled={depsLoading}
                  title="Recarregar departamentos do GêTeams"
                  className="h-8 px-2.5 rounded-lg text-xs text-muted-foreground hover:text-primary"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', depsLoading && 'animate-spin')} />
                  Atualizar lista
                </Button>
              </div>
              {depsLoading ? (
                <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                  <LoadingGif size="sm" />
                  Carregando departamentos do GêTeams…
                </div>
              ) : modalDepartments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/[0.06] px-4 py-4 text-sm text-muted-foreground">
                  Nenhum departamento retornado. Verifique a API e use{' '}
                  <strong className="text-foreground">Atualizar lista</strong>.
                </div>
              ) : (
                <Select value={selectedDeptId || undefined} onValueChange={setSelectedDeptId}>
                  <SelectTrigger
                    id="equipes-dept-select-trigger"
                    className="h-12 rounded-2xl border-border/60 bg-gradient-to-b from-background to-muted/15 pl-4 pr-3 text-left shadow-sm hover:shadow-md hover:border-primary/30 transition-shadow"
                  >
                    <SelectValue placeholder="Selecione um departamento…" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-[280px]">
                    {modalDepartments.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="rounded-lg cursor-pointer">
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-border/50 bg-muted/10 px-6 py-4 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-11 border-border/60"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 rounded-xl h-11 shadow-md shadow-primary/10"
              onClick={handleCreateEquipe}
              disabled={formLoading}
            >
              {formLoading ? <LoadingGif size="sm" className="mr-2" /> : <Plus className="w-4 h-4 mr-2 opacity-90" />}
              Criar equipe
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Acesso a sistemas por departamento */}
      <Dialog open={!!deptModalRow} onOpenChange={(o) => { if (!o) setDeptModalRow(null); }}>
        <DialogContent className="sm:max-w-lg rounded-3xl border border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-border/40 bg-muted/20 shrink-0">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner text-primary">
                    {deptModalRow?.icon
                      ? renderSystemIcon(deptModalRow.icon, 'w-7 h-7 object-contain drop-shadow')
                      : <LayoutGrid className="w-6 h-6 opacity-70" />
                    }
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-xl font-semibold tracking-tight truncate">{deptModalRow?.name}</DialogTitle>
                    <DialogDescription className="text-sm mt-1">
                      Gerencie o acesso aos sistemas para todos os colaboradores deste departamento
                    </DialogDescription>
                  </div>
                </div>
                {!deptModalLoading && (
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 shadow-sm">
                      <Check className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary whitespace-nowrap">
                        {deptModalSystems.filter((s) => s.canAccess).length} liberados
                      </span>
                    </div>
                    {deptModalRow && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {(collaboratorsByDeptId.get(teams.find((t) => t.id === deptModalRow.id)?.neonDepartmentId ?? '') ?? []).slice(0, 4).map((c) => (
                          <Avatar key={c.id} className="w-5 h-5 border border-background">
                            <AvatarImage src={c.avatar} alt={c.name} />
                            <AvatarFallback className="text-[8px] bg-primary/20 text-primary font-bold">
                              {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-1">
                          {deptModalRow.collaboratorCount} colaborador{deptModalRow.collaboratorCount === 1 ? '' : 'es'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogHeader>

            {/* Busca + filtro */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-5">
              <div className="relative w-full sm:flex-1 group/search">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within/search:text-primary transition-colors duration-200" />
                <Input
                  placeholder="Buscar sistema..."
                  className="pl-9 h-10 rounded-xl bg-background/50 border-border/60 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50 w-full"
                  value={deptSystemSearch}
                  onChange={(e) => setDeptSystemSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-1 w-full sm:w-auto p-1 rounded-xl bg-muted/40 border border-border/40 shrink-0">
                {(['all', 'granted', 'denied'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setDeptSystemFilter(f)}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                      deptSystemFilter === f
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    {f === 'all' ? 'Todos' : f === 'granted' ? 'Liberados' : 'Bloqueados'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lista de sistemas */}
          <div className="flex-1 overflow-y-auto p-6 space-y-2.5 min-h-0 bg-background/50">
            {deptModalLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                <span className="text-sm text-muted-foreground animate-pulse">Carregando sistemas...</span>
              </div>
            ) : (() => {
              const q = deptSystemSearch.trim().toLowerCase();
              const filtered = deptModalSystems.filter((s) => {
                const matchSearch = !q || s.name.toLowerCase().includes(q);
                const matchFilter =
                  deptSystemFilter === 'all' ||
                  (deptSystemFilter === 'granted' && s.canAccess) ||
                  (deptSystemFilter === 'denied' && !s.canAccess);
                return matchSearch && matchFilter;
              });
              if (filtered.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                      <Search className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">Nenhum sistema encontrado.</p>
                  </div>
                );
              }
              return (
                <AnimatePresence initial={false}>
                  {filtered.map((sys) => (
                    <motion.button
                      key={sys.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      onClick={() =>
                        setDeptModalSystems((prev) =>
                          prev.map((s) => s.id === sys.id ? { ...s, canAccess: !s.canAccess } : s)
                        )
                      }
                      className={`w-full flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300 text-left group/item relative overflow-hidden ${
                        sys.canAccess
                          ? 'bg-primary/5 border-primary/20 shadow-sm hover:bg-primary/10 hover:border-primary/30 hover:shadow-md'
                          : 'bg-muted/10 border-border/40 hover:bg-muted/30 hover:border-border/60 hover:shadow-sm'
                      }`}
                    >
                      {sys.canAccess && (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-500" />
                      )}
                      {/* Ícone do sistema */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 relative z-10 overflow-hidden border ${
                        sys.canAccess
                          ? 'bg-primary/15 text-primary border-primary/20'
                          : 'bg-muted/50 text-muted-foreground border-border/50'
                      }`}>
                        {renderSystemIcon(sys.icon, 'w-6 h-6 object-contain')}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0 relative z-10">
                        <p className={`text-sm font-semibold truncate transition-colors duration-300 ${
                          sys.canAccess ? 'text-foreground' : 'text-muted-foreground group-hover/item:text-foreground/80'
                        }`}>
                          {sys.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${
                            sys.canAccess
                              ? 'bg-primary/10 border-primary/20 text-primary'
                              : 'bg-muted/50 border-border/40 text-muted-foreground'
                          }`}>
                            {sys.canAccess ? 'Liberado' : 'Bloqueado'}
                          </span>
                          {sys.canAccess !== sys.original && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-yellow-500/15 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 font-bold uppercase tracking-wider animate-in fade-in zoom-in duration-300">
                              alterado
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Toggle */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 relative z-10 border-2 ${
                        sys.canAccess
                          ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20 scale-110'
                          : 'bg-transparent border-muted-foreground/30 text-transparent group-hover/item:border-muted-foreground/50 scale-100'
                      }`}>
                        <Check className={`w-3.5 h-3.5 transition-transform duration-300 ${sys.canAccess ? 'scale-100' : 'scale-0'}`} strokeWidth={3} />
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              );
            })()}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-border/40 bg-muted/20 shrink-0 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {(() => {
                const changedCount = deptModalSystems.filter((s) => s.canAccess !== s.original).length;
                return changedCount > 0 ? (
                  <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400 font-medium animate-in fade-in slide-in-from-bottom-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                    {changedCount} alteraç{changedCount > 1 ? 'ões' : 'ão'} pendente{changedCount > 1 ? 's' : ''}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma alteração pendente</p>
                );
              })()}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" className="rounded-xl h-10 px-4" onClick={() => setDeptModalRow(null)}>
                Cancelar
              </Button>
              <Button
                className={`rounded-xl h-10 px-5 gap-2 transition-all duration-300 ${
                  deptModalSystems.some((s) => s.canAccess !== s.original) && !deptModalSaving
                    ? 'shadow-lg shadow-primary/25 hover:shadow-primary/40'
                    : ''
                }`}
                onClick={handleSaveDeptAccess}
                disabled={deptModalSaving || !deptModalSystems.some((s) => s.canAccess !== s.original)}
              >
                {deptModalSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                {deptModalSaving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Acesso a sistemas por setor (somente colaboradores deste setor) */}
      <Dialog open={!!sectorModalRow} onOpenChange={(o) => { if (!o) setSectorModalRow(null); }}>
        <DialogContent className="sm:max-w-lg rounded-3xl border border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="p-6 border-b border-border/40 bg-muted/20 shrink-0">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner text-primary">
                    {sectorModalRow?.icon
                      ? renderSystemIcon(sectorModalRow.icon, 'w-7 h-7 object-contain drop-shadow')
                      : <Layers className="w-6 h-6 opacity-70" />}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-xl font-semibold tracking-tight truncate">
                      {sectorModalRow?.sectorName}
                    </DialogTitle>
                    <DialogDescription className="text-sm mt-1">
                      <span className="text-muted-foreground">{sectorModalRow?.departmentName}</span>
                      <span className="block mt-1">
                        Acesso aos sistemas apenas para colaboradores deste setor (não altera o restante do departamento).
                      </span>
                    </DialogDescription>
                  </div>
                </div>
                {!sectorModalLoading && sectorModalRow && (
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 shadow-sm">
                      <Check className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary whitespace-nowrap">
                        {sectorModalSystems.filter((s) => s.canAccess).length} liberados
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {(sectorModalRow.collaborators ?? []).slice(0, 4).map((c) => (
                        <Avatar key={c.id} className="w-5 h-5 border border-background">
                          <AvatarImage src={c.avatar} alt={c.name} />
                          <AvatarFallback className="text-[8px] bg-primary/20 text-primary font-bold">
                            {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      <span className="text-[10px] text-muted-foreground ml-1">
                        {sectorModalRow.collaboratorCount} colaborador{sectorModalRow.collaboratorCount === 1 ? '' : 'es'} no setor
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </DialogHeader>

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-5">
              <div className="relative w-full sm:flex-1 group/search">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within/search:text-primary transition-colors duration-200" />
                <Input
                  placeholder="Buscar sistema..."
                  className="pl-9 h-10 rounded-xl bg-background/50 border-border/60 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50 w-full"
                  value={sectorSystemSearch}
                  onChange={(e) => setSectorSystemSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-1 w-full sm:w-auto p-1 rounded-xl bg-muted/40 border border-border/40 shrink-0">
                {(['all', 'granted', 'denied'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSectorSystemFilter(f)}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                      sectorSystemFilter === f
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    {f === 'all' ? 'Todos' : f === 'granted' ? 'Liberados' : 'Bloqueados'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-2.5 min-h-0 bg-background/50">
            {sectorModalLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                <span className="text-sm text-muted-foreground animate-pulse">Carregando sistemas...</span>
              </div>
            ) : (() => {
              const q = sectorSystemSearch.trim().toLowerCase();
              const filtered = sectorModalSystems.filter((s) => {
                const matchSearch = !q || s.name.toLowerCase().includes(q);
                const matchFilter =
                  sectorSystemFilter === 'all' ||
                  (sectorSystemFilter === 'granted' && s.canAccess) ||
                  (sectorSystemFilter === 'denied' && !s.canAccess);
                return matchSearch && matchFilter;
              });
              if (filtered.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                      <Search className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">Nenhum sistema encontrado.</p>
                  </div>
                );
              }
              return (
                <AnimatePresence initial={false}>
                  {filtered.map((sys) => (
                    <motion.button
                      key={sys.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      type="button"
                      onClick={() =>
                        setSectorModalSystems((prev) =>
                          prev.map((s) => (s.id === sys.id ? { ...s, canAccess: !s.canAccess } : s)),
                        )
                      }
                      className={`w-full flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300 text-left group/item relative overflow-hidden ${
                        sys.canAccess
                          ? 'bg-primary/5 border-primary/20 shadow-sm hover:bg-primary/10 hover:border-primary/30 hover:shadow-md'
                          : 'bg-muted/10 border-border/40 hover:bg-muted/30 hover:border-border/60 hover:shadow-sm'
                      }`}
                    >
                      {sys.canAccess && (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-500" />
                      )}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 relative z-10 overflow-hidden border ${
                          sys.canAccess
                            ? 'bg-primary/15 text-primary border-primary/20'
                            : 'bg-muted/50 text-muted-foreground border-border/50'
                        }`}
                      >
                        {renderSystemIcon(sys.icon, 'w-6 h-6 object-contain')}
                      </div>
                      <div className="flex-1 min-w-0 relative z-10">
                        <p
                          className={`text-sm font-semibold truncate transition-colors duration-300 ${
                            sys.canAccess ? 'text-foreground' : 'text-muted-foreground group-hover/item:text-foreground/80'
                          }`}
                        >
                          {sys.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${
                              sys.canAccess
                                ? 'bg-primary/10 border-primary/20 text-primary'
                                : 'bg-muted/50 border-border/40 text-muted-foreground'
                            }`}
                          >
                            {sys.canAccess ? 'Liberado' : 'Bloqueado'}
                          </span>
                          {sys.canAccess !== sys.original && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-yellow-500/15 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 font-bold uppercase tracking-wider animate-in fade-in zoom-in duration-300">
                              alterado
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 relative z-10 border-2 ${
                          sys.canAccess
                            ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20 scale-110'
                            : 'bg-transparent border-muted-foreground/30 text-transparent group-hover/item:border-muted-foreground/50 scale-100'
                        }`}
                      >
                        <Check className={`w-3.5 h-3.5 transition-transform duration-300 ${sys.canAccess ? 'scale-100' : 'scale-0'}`} strokeWidth={3} />
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              );
            })()}
          </div>

          <div className="p-5 border-t border-border/40 bg-muted/20 shrink-0 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {(() => {
                const changedCount = sectorModalSystems.filter((s) => s.canAccess !== s.original).length;
                const noProfiles = (sectorModalRow?.collaborators ?? []).length === 0;
                if (noProfiles && !sectorModalLoading) {
                  return (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Nenhum colaborador com perfil GêApps neste setor — cadastre ou vincule e-mails para aplicar acessos.
                    </p>
                  );
                }
                return changedCount > 0 ? (
                  <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400 font-medium animate-in fade-in slide-in-from-bottom-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                    {changedCount} alteraç{changedCount > 1 ? 'ões' : 'ão'} pendente{changedCount > 1 ? 's' : ''}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma alteração pendente</p>
                );
              })()}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" className="rounded-xl h-10 px-4" onClick={() => setSectorModalRow(null)}>
                Cancelar
              </Button>
              <Button
                className={`rounded-xl h-10 px-5 gap-2 transition-all duration-300 ${
                  sectorModalSystems.some((s) => s.canAccess !== s.original) && !sectorModalSaving
                    ? 'shadow-lg shadow-primary/25 hover:shadow-primary/40'
                    : ''
                }`}
                onClick={handleSaveSectorAccess}
                disabled={
                  sectorModalSaving ||
                  !sectorModalSystems.some((s) => s.canAccess !== s.original) ||
                  (sectorModalRow?.collaborators ?? []).length === 0
                }
              >
                {sectorModalSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                {sectorModalSaving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
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
  );
}
