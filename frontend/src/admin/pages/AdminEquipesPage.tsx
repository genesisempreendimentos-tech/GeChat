import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Users, Flower2, RefreshCw, AlertCircle, Building2, Loader2, Check, Unlock, LayoutGrid, Layers, Grid2x2, Shapes, Table2 } from 'lucide-react';
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
import { MainViewHeader } from '@/components/layout/header';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { AdminControlLine } from '@/admin/components/AdminControlLine';
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
import {
  TeamsEnrichedView,
  type TeamDisplayRow,
  type TeamCollaboratorPreview,
  type TeamSectorItem,
  type TeamsViewMode,
} from '@/components/teams/TeamsEnrichedView';
import { TabButtons, type TabButtonItem } from '@/components/ui/tab-buttons';
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

const TOPIC_TAB_ITEMS: ReadonlyArray<TabButtonItem<EquipesTopicTab>> = [
  { value: TOPIC_DEPARTMENTS, label: 'Departamentos', Icon: Grid2x2 },
  { value: TOPIC_SECTORS, label: 'Setores', Icon: Shapes },
  { value: TOPIC_COLLABORATORS, label: 'Colaboradores', Icon: Users },
];
const VIEW_TAB_ITEMS: ReadonlyArray<TabButtonItem<TeamsViewMode>> = [
  { value: 'table', label: 'Tabela', Icon: Table2 },
  { value: 'cards', label: 'Cards', Icon: LayoutGrid },
];

/** Curvas e spring compartilhados — troca de painel mais orgânica (sem “corte seco”). */
const EASE_MODAL: [number, number, number, number] = [0.2, 0.85, 0.35, 1];
const EASE_MODAL_OUT: [number, number, number, number] = [0.45, 0, 0.55, 1];

const MODAL_FILTER_SPRING = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.72 };

const MODAL_PANEL_INITIAL = { opacity: 0, y: 18, scale: 0.96 };
const MODAL_PANEL_ANIMATE = { opacity: 1, y: 0, scale: 1 };
const MODAL_PANEL_TRANSITION = {
  opacity: { duration: 0.4, ease: EASE_MODAL },
  y: { type: 'spring' as const, stiffness: 280, damping: 22, mass: 0.78 },
  scale: { type: 'spring' as const, stiffness: 380, damping: 28 },
};
const MODAL_PANEL_EXIT = {
  opacity: 0,
  y: -10,
  scale: 0.98,
  transition: { duration: 0.26, ease: EASE_MODAL_OUT },
};

const MODAL_LIST_STAGGER_CONTAINER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.09 } },
};

const MODAL_LIST_STAGGER_ITEM = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      opacity: { duration: 0.34, ease: EASE_MODAL },
      y: { type: 'spring' as const, stiffness: 300, damping: 24, mass: 0.72 },
    },
  },
};

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

export default function AdminEquipesPage() {
  const { user: currentUser } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [topicView, setTopicView] = useState<EquipesTopicTab>(TOPIC_DEPARTMENTS);
  const [viewMode, setViewMode] = useState<TeamsViewMode>('cards');

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

  // Modal de departamento — acesso a aplicativos
  const [deptModalRow, setDeptModalRow] = useState<TeamDisplayRow | null>(null);
  const [deptModalSystems, setDeptModalSystems] = useState<Array<{
    id: string; name: string; icon: string; status?: string;
    canAccess: boolean; original: boolean;
  }>>([]);
  const [deptModalLoading, setDeptModalLoading] = useState(false);
  const [deptModalSaving, setDeptModalSaving] = useState(false);
  const [deptSystemSearch, setDeptSystemSearch] = useState('');
  const [deptSystemFilter, setDeptSystemFilter] = useState<'all' | 'granted' | 'denied'>('all');
  /** No modal de dept: aplicativos (padrão) ou lista de colaboradores do departamento */
  const [deptModalPanel, setDeptModalPanel] = useState<'systems' | 'collaborators'>('systems');

  // Modal de setor — acesso a aplicativos (apenas colaboradores daquele setor)
  const [sectorModalRow, setSectorModalRow] = useState<SectorTopicRow | null>(null);
  const [sectorModalSystems, setSectorModalSystems] = useState<Array<{
    id: string; name: string; icon: string; status?: string;
    canAccess: boolean; original: boolean;
  }>>([]);
  const [sectorModalLoading, setSectorModalLoading] = useState(false);
  const [sectorModalSaving, setSectorModalSaving] = useState(false);
  const [sectorSystemSearch, setSectorSystemSearch] = useState('');
  const [sectorSystemFilter, setSectorSystemFilter] = useState<'all' | 'granted' | 'denied'>('all');
  const [sectorModalPanel, setSectorModalPanel] = useState<'systems' | 'collaborators'>('systems');

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

    // Montar lista de colaboradores enriquecidos (avatar + ícones/cores de departamento e setor)
    const enriched: CollaboratorWithAvatar[] = collabList.map((c) => {
      const profile = collabMap.get(c.neonDepartmentId)?.find(
        (p) => p.email.toLowerCase() === c.email.toLowerCase(),
      );
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
    const { data: company, error: companyErr } = await databaseService.getCompanyProfile();
    if (companyErr || !company) {
      setFormError('Não foi possível carregar o perfil da empresa.');
      return;
    }
    const workspaceName = String(company.geTeamsWorkspace ?? '').trim();
    if (!workspaceName) {
      setFormError(
        'Configure o workspace em Admin → Coco antes de criar equipes (mock).',
      );
      return;
    }
    const deptWsId = selectedDept.workspaceId?.trim() || '';
    const companyWsId = String(company.geTeamsWorkspaceId ?? '').trim();
    setFormLoading(true);
    const { data, error } = await databaseService.createTeam({
      name: selectedDept.name.trim(),
      neon_department_id: selectedDept.id,
      status: 'active',
      workspace_name: workspaceName,
      workspace_id: deptWsId || companyWsId || null,
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
          : 'Erro ao criar equipe (mock — sem persistência real).';
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
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code: string }).code)
          : '';
      let msg =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: string }).message)
          : 'Não foi possível atualizar o status.';
      if (code === '23514') {
        msg =
          'O banco não aceita este status. Rode migration-teams-status-upgrade.sql para permitir deleted em teams.status.';
      } else if (code === 'PGRST116' || msg.toLowerCase().includes('0 rows')) {
        msg = 'Sem permissão para ver/gravar esta equipe (RLS) ou id inválido.';
      }
      toast.error(msg);
      return;
    }
    toast.success(status === 'active' ? 'Equipe ativa.' : 'Equipe marcada como excluída.');
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

  const resolveGeappsUserIdsByEmail = useCallback(
    async (emails: string[]) => {
      const normalized = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
      if (!normalized.length) return new Map<string, string>();
      const { data } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('email', normalized);
      const out = new Map<string, string>();
      for (const row of data ?? []) {
        const email = (row.email ?? '').toString().trim().toLowerCase();
        const userId = (row.user_id ?? '').toString().trim();
        if (email && userId) out.set(email, userId);
      }
      return out;
    },
    [],
  );

  const handleDeptCardClick = useCallback(async (row: TeamDisplayRow) => {
    setDeptModalRow(row);
    setDeptSystemSearch('');
    setDeptSystemFilter('all');
    setDeptModalPanel('systems');
    setDeptModalLoading(true);

    // Busca todos os aplicativos e verifica quais os colaboradores do dept têm acesso
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

    const emailToUserId = await resolveGeappsUserIdsByEmail(collabs.map((c) => c.email));

    // Para cada sistema, verifica se algum colaborador do dept tem acesso
    const systemAccessResults = await Promise.all(
      allSystems.map(async (sys: any) => {
        const { data: usersWithAccess } = await databaseService.getUsersWithAccessToApp(sys.id);
        const accessIds = new Set((usersWithAccess ?? []).map((u: any) => u.id));
        // Considera "com acesso" se pelo menos 1 colaborador do dept tem acesso
        const anyHasAccess = collabs.some((c) => {
          const uid = emailToUserId.get(c.email.toLowerCase());
          return !!uid && accessIds.has(uid);
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
  }, [collaboratorsWithAvatar, teams, resolveGeappsUserIdsByEmail]);

  const handleSaveDeptAccess = useCallback(async () => {
    if (!deptModalRow) return;
    setDeptModalSaving(true);

    const team = teams.find((t) => t.id === deptModalRow.id);
    const deptId = team?.neonDepartmentId ?? '';
    const collabPreviews = collaboratorsByDeptId.get(deptId) ?? [];
    const emailToUserId = await resolveGeappsUserIdsByEmail(collabPreviews.map((c) => c.email));
    const targetUserIds = [...new Set(collabPreviews
      .map((c) => emailToUserId.get(c.email.toLowerCase()) ?? '')
      .filter(Boolean))];
    const changed = deptModalSystems.filter((s) => s.canAccess !== s.original);

    await Promise.all(
      changed.flatMap((sys) =>
        targetUserIds.map((userId) =>
          databaseService.setUserSystemAccess(userId, sys.id, sys.canAccess)
        )
      )
    );

    setDeptModalSystems((prev) =>
      prev.map((s) => ({ ...s, original: s.canAccess }))
    );
    setDeptModalSaving(false);
    toast.success('Acessos do departamento atualizados.');
  }, [deptModalRow, deptModalSystems, collaboratorsByDeptId, teams, resolveGeappsUserIdsByEmail]);

  const handleSectorClick = useCallback(
    async (sector: SectorTopicRow) => {
      setSectorModalRow(sector);
      setSectorSystemSearch('');
      setSectorSystemFilter('all');
      setSectorModalPanel('systems');
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

      const emailToUserId = await resolveGeappsUserIdsByEmail(collabs.map((c) => c.email));

      const systemAccessResults = await Promise.all(
        allSystems.map(async (sys: any) => {
          const { data: usersWithAccess } = await databaseService.getUsersWithAccessToApp(sys.id);
          const accessIds = new Set((usersWithAccess ?? []).map((u: any) => u.id));
          const anyHasAccess = collabs.some((c) => {
            const uid = emailToUserId.get(c.email.toLowerCase());
            return !!uid && accessIds.has(uid);
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
    [collaboratorsWithAvatar, resolveGeappsUserIdsByEmail],
  );

  const handleSaveSectorAccess = useCallback(async () => {
    if (!sectorModalRow) return;
    setSectorModalSaving(true);

    const previews = sectorModalRow.collaborators ?? [];
    const emailToUserId = await resolveGeappsUserIdsByEmail(previews.map((c) => c.email));
    const targetUserIds = [...new Set(previews
      .map((c) => emailToUserId.get(c.email.toLowerCase()) ?? '')
      .filter(Boolean))];
    const changed = sectorModalSystems.filter((s) => s.canAccess !== s.original);

    await Promise.all(
      changed.flatMap((sys) =>
        targetUserIds.map((userId) =>
          databaseService.setUserSystemAccess(userId, sys.id, sys.canAccess),
        ),
      ),
    );

    setSectorModalSystems((prev) => prev.map((s) => ({ ...s, original: s.canAccess })));
    setSectorModalSaving(false);
    toast.success('Acessos do setor atualizados.');
  }, [sectorModalRow, sectorModalSystems, resolveGeappsUserIdsByEmail]);

  const handleCollaboratorClick = useCallback(async (collab: CollaboratorWithAvatar) => {
    setLoadingCollaboratorId(collab.id);
    const { data } = await databaseService.getProfileForPopupByEmail(collab.email);
    setLoadingCollaboratorId(null);
    if (data) {
      setSelectedProfileData(data);
      setProfilePopupOpen(true);
    } else {
      // Colaborador sem perfil local — mostra dados mínimos (mock)
      setSelectedProfileData({
        full_name: collab.name,
        email: collab.email,
        avatar_url: collab.avatar,
        profession: collab.sectorName || collab.departmentName,
        birth_date: collab.birthDate || null,
        hire_date: collab.hireDate || null,
      });
      setProfilePopupOpen(true);
    }
  }, []);

  const openProfileFromPreview = useCallback(async (c: TeamCollaboratorPreview) => {
    setLoadingCollaboratorId(c.id);
    const { data } = await databaseService.getProfileForPopupByEmail(c.email);
    setLoadingCollaboratorId(null);
    if (data) {
      setSelectedProfileData(data);
      setProfilePopupOpen(true);
    } else {
      setSelectedProfileData({
        full_name: c.name,
        email: c.email,
        avatar_url: c.avatar,
        profession: '',
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

  return (
    <MainViewFluidShell>
    <div className="space-y-6">
      <MainViewHeader
        icon={<Flower2 className="h-6 w-6" />}
        title="Pitaya"
        description="Cadastre equipes e defina quem pode vê-las no genovo."
        button={
          <Button
            type="button"
            onClick={openCreate}
            className="h-10 rounded-xl px-4 font-semibold shadow-sm shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar equipe
          </Button>
        }
      />

      <AdminControlLine
        viewMode={viewMode}
        onViewModeChange={setViewMode}
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
            onCollaboratorPreviewClick={(c) => {
              void openProfileFromPreview(c);
            }}
            loadingCollaboratorId={loadingCollaboratorId}
            emptyTitle="Nenhuma equipe encontrada"
            emptyHint={
              teams.length === 0
                ? 'Use Adicionar equipe para vincular um departamento (mock). Sem banco real neste projeto.'
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
                ? 'Cadastre equipes (departamentos) para carregar setores e colaboradores (mock).'
                : topicView === TOPIC_SECTORS
                  ? 'Não há setores associados aos departamentos das equipes ou a busca não encontrou resultados.'
                  : 'Não há colaboradores ativos ligados a esses departamentos no mock ou a busca não encontrou resultados.'
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
                    Escolha o departamento de origem para exibir no hub (mock).
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
                  title="Recarregar departamentos (mock)"
                  className="h-8 px-2.5 rounded-lg text-xs text-muted-foreground hover:text-primary"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', depsLoading && 'animate-spin')} />
                  Atualizar lista
                </Button>
              </div>
              {depsLoading ? (
                <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                  <LoadingGif size="sm" />
                  Carregando departamentos (mock)…
                </div>
              ) : modalDepartments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/[0.06] px-4 py-4 text-sm text-muted-foreground">
                  Nenhum departamento para este <code className="text-xs">workspace_id</code> no mock. Ajuste os dados ou use{' '}
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

      {/* Modal: Acesso a aplicativos por departamento */}
      <Dialog
        open={!!deptModalRow}
        onOpenChange={(o) => {
          if (!o) {
            setDeptModalRow(null);
            setDeptModalPanel('systems');
          }
        }}
      >
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
                      Gerencie o acesso aos aplicativos para todos os colaboradores deste departamento
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

            {/* Busca + alternância aplicativos/colaboradores + filtro de aplicativos */}
            <div className="flex flex-col gap-3 mt-5">
              <div className="relative w-full group/search">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within/search:text-primary transition-colors duration-200" />
                <Input
                  placeholder={deptModalPanel === 'systems' ? 'Buscar sistema…' : 'Buscar colaborador…'}
                  className="pl-9 h-10 rounded-xl bg-background/50 border-border/60 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50 w-full"
                  value={deptSystemSearch}
                  onChange={(e) => setDeptSystemSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full">
                <div className="flex gap-1 w-full sm:w-auto p-1 rounded-xl bg-muted/40 border border-border/40 shrink-0">
                  {(['systems', 'collaborators'] as const).map((panel) => (
                    <button
                      key={panel}
                      type="button"
                      onClick={() => setDeptModalPanel(panel)}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                        deptModalPanel === panel
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      {panel === 'systems' ? 'Morango' : 'Colaboradores'}
                    </button>
                  ))}
                </div>
                <AnimatePresence initial={false}>
                  {deptModalPanel === 'systems' && (
                    <motion.div
                      key="dept-sys-filters"
                      initial={{ opacity: 0, x: -12, scale: 0.97 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -8, scale: 0.98, transition: { duration: 0.2, ease: EASE_MODAL_OUT } }}
                      transition={MODAL_FILTER_SPRING}
                      className="flex gap-1 w-full sm:w-auto p-1 rounded-xl bg-muted/40 border border-border/40 shrink-0"
                    >
                      {(['all', 'granted', 'denied'] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Lista: crossfade suave (sync) + spring no painel; stagger nos itens */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-background/50">
            <AnimatePresence mode="sync" initial={false}>
              <motion.div
                key={
                  deptModalPanel === 'collaborators'
                    ? 'dept-collab'
                    : deptModalLoading
                      ? 'dept-load'
                      : 'dept-sys'
                }
                initial={MODAL_PANEL_INITIAL}
                animate={MODAL_PANEL_ANIMATE}
                exit={MODAL_PANEL_EXIT}
                transition={MODAL_PANEL_TRANSITION}
                className="space-y-2.5"
              >
                {deptModalPanel === 'collaborators' ? (() => {
                  const q = deptSystemSearch.trim().toLowerCase();
                  const collabs = deptModalRow?.collaborators ?? [];
                  const filtered = collabs.filter(
                    (c) =>
                      !q ||
                      c.name.toLowerCase().includes(q) ||
                      c.email.toLowerCase().includes(q),
                  );
                  if (filtered.length === 0) {
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: EASE_MODAL, delay: 0.06 }}
                        className="flex flex-col items-center justify-center py-16 gap-3"
                      >
                        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                          <Users className="w-5 h-5 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium text-center px-4">
                          {collabs.length === 0
                            ? 'Nenhum colaborador vinculado a este departamento.'
                            : 'Nenhum colaborador encontrado para a busca.'}
                        </p>
                      </motion.div>
                    );
                  }
                  return (
                    <motion.div
                      className="space-y-2.5"
                      variants={MODAL_LIST_STAGGER_CONTAINER}
                      initial="hidden"
                      animate="show"
                    >
                      {filtered.map((c) => (
                        <motion.div key={c.id} variants={MODAL_LIST_STAGGER_ITEM}>
                          <button
                            type="button"
                            onClick={() => openProfileFromPreview(c)}
                            disabled={loadingCollaboratorId === c.id}
                            className="w-full flex items-center gap-4 p-3 rounded-2xl border border-border/40 bg-muted/10 hover:bg-muted/25 hover:border-border/60 transition-colors duration-200 text-left"
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
                              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                            ) : null}
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  );
                })() : deptModalLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.35, ease: EASE_MODAL }}
                    className="flex flex-col items-center justify-center py-16 gap-3"
                  >
                    <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                    <span className="text-sm text-muted-foreground animate-pulse">Carregando aplicativos...</span>
                  </motion.div>
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
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: EASE_MODAL, delay: 0.06 }}
                        className="flex flex-col items-center justify-center py-16 gap-3"
                      >
                        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                          <Search className="w-5 h-5 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">Nenhum sistema encontrado.</p>
                      </motion.div>
                    );
                  }
                  return (
                    <motion.div
                      className="space-y-2.5"
                      variants={MODAL_LIST_STAGGER_CONTAINER}
                      initial="hidden"
                      animate="show"
                    >
                      {filtered.map((sys) => (
                        <motion.div key={sys.id} variants={MODAL_LIST_STAGGER_ITEM}>
                          <button
                            type="button"
                            onClick={() =>
                              setDeptModalSystems((prev) =>
                                prev.map((s) => (s.id === sys.id ? { ...s, canAccess: !s.canAccess } : s)),
                              )
                            }
                            className={`w-full flex items-center gap-4 p-3 rounded-2xl border transition-colors duration-200 text-left group/item relative overflow-hidden ${
                              sys.canAccess
                                ? 'bg-primary/5 border-primary/20 shadow-sm hover:bg-primary/10 hover:border-primary/30 hover:shadow-md'
                                : 'bg-muted/10 border-border/40 hover:bg-muted/30 hover:border-border/60 hover:shadow-sm'
                            }`}
                          >
                            {sys.canAccess && (
                              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-500" />
                            )}
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200 relative z-10 overflow-hidden border ${
                                sys.canAccess
                                  ? 'bg-primary/15 text-primary border-primary/20'
                                  : 'bg-muted/50 text-muted-foreground border-border/50'
                              }`}
                            >
                              {renderSystemIcon(sys.icon, 'w-6 h-6 object-contain')}
                            </div>
                            <div className="flex-1 min-w-0 relative z-10">
                              <p
                                className={`text-sm font-semibold truncate transition-colors duration-200 ${
                                  sys.canAccess
                                    ? 'text-foreground'
                                    : 'text-muted-foreground group-hover/item:text-foreground/80'
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
                              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 relative z-10 border-2 ${
                                sys.canAccess
                                  ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20 scale-110'
                                  : 'bg-transparent border-muted-foreground/30 text-transparent group-hover/item:border-muted-foreground/50 scale-100'
                              }`}
                            >
                              <Check
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${sys.canAccess ? 'scale-100' : 'scale-0'}`}
                                strokeWidth={3}
                              />
                            </div>
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-border/40 bg-muted/20 shrink-0 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {deptModalPanel === 'collaborators' ? (
                <p className="text-sm text-muted-foreground"></p>
              ) : (
                (() => {
                  const changedCount = deptModalSystems.filter((s) => s.canAccess !== s.original).length;
                  return changedCount > 0 ? (
                    <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400 font-medium animate-in fade-in slide-in-from-bottom-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                      {changedCount} alteraç{changedCount > 1 ? 'ões' : 'ão'} pendente{changedCount > 1 ? 's' : ''}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma alteração pendente</p>
                  );
                })()
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" className="rounded-xl h-10 px-4" onClick={() => setDeptModalRow(null)}>
                Cancelar
              </Button>
              <Button
                className={`rounded-xl h-10 px-5 gap-2 transition-all duration-300 ${
                  deptModalPanel === 'systems' &&
                  deptModalSystems.some((s) => s.canAccess !== s.original) &&
                  !deptModalSaving
                    ? 'shadow-lg shadow-primary/25 hover:shadow-primary/40'
                    : ''
                }`}
                onClick={handleSaveDeptAccess}
                disabled={
                  deptModalPanel !== 'systems' ||
                  deptModalSaving ||
                  !deptModalSystems.some((s) => s.canAccess !== s.original)
                }
              >
                {deptModalSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                {deptModalSaving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Acesso a aplicativos por setor (somente colaboradores deste setor) */}
      <Dialog
        open={!!sectorModalRow}
        onOpenChange={(o) => {
          if (!o) {
            setSectorModalRow(null);
            setSectorModalPanel('systems');
          }
        }}
      >
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
                        Acesso aos aplicativos apenas para colaboradores deste setor (não altera o restante do departamento).
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

            <div className="flex flex-col gap-3 mt-5">
              <div className="relative w-full group/search">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within/search:text-primary transition-colors duration-200" />
                <Input
                  placeholder={sectorModalPanel === 'systems' ? 'Buscar sistema…' : 'Buscar colaborador…'}
                  className="pl-9 h-10 rounded-xl bg-background/50 border-border/60 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50 w-full"
                  value={sectorSystemSearch}
                  onChange={(e) => setSectorSystemSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full">
                <div className="flex gap-1 w-full sm:w-auto p-1 rounded-xl bg-muted/40 border border-border/40 shrink-0">
                  {(['systems', 'collaborators'] as const).map((panel) => (
                    <button
                      key={panel}
                      type="button"
                      onClick={() => setSectorModalPanel(panel)}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                        sectorModalPanel === panel
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      {panel === 'systems' ? 'aplicativos' : 'Colaboradores'}
                    </button>
                  ))}
                </div>
                <AnimatePresence initial={false}>
                  {sectorModalPanel === 'systems' && (
                    <motion.div
                      key="sector-sys-filters"
                      initial={{ opacity: 0, x: -12, scale: 0.97 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -8, scale: 0.98, transition: { duration: 0.2, ease: EASE_MODAL_OUT } }}
                      transition={MODAL_FILTER_SPRING}
                      className="flex gap-1 w-full sm:w-auto p-1 rounded-xl bg-muted/40 border border-border/40 shrink-0"
                    >
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-background/50">
            <AnimatePresence mode="sync" initial={false}>
              <motion.div
                key={
                  sectorModalPanel === 'collaborators'
                    ? 'sector-collab'
                    : sectorModalLoading
                      ? 'sector-load'
                      : 'sector-sys'
                }
                initial={MODAL_PANEL_INITIAL}
                animate={MODAL_PANEL_ANIMATE}
                exit={MODAL_PANEL_EXIT}
                transition={MODAL_PANEL_TRANSITION}
                className="space-y-2.5"
              >
                {sectorModalPanel === 'collaborators' ? (() => {
                  const q = sectorSystemSearch.trim().toLowerCase();
                  const collabs = sectorModalRow?.collaborators ?? [];
                  const filtered = collabs.filter(
                    (c) =>
                      !q ||
                      c.name.toLowerCase().includes(q) ||
                      c.email.toLowerCase().includes(q),
                  );
                  if (filtered.length === 0) {
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: EASE_MODAL, delay: 0.06 }}
                        className="flex flex-col items-center justify-center py-16 gap-3"
                      >
                        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                          <Users className="w-5 h-5 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium text-center px-4">
                          {collabs.length === 0
                            ? 'Nenhum colaborador com perfil neste setor.'
                            : 'Nenhum colaborador encontrado para a busca.'}
                        </p>
                      </motion.div>
                    );
                  }
                  return (
                    <motion.div
                      className="space-y-2.5"
                      variants={MODAL_LIST_STAGGER_CONTAINER}
                      initial="hidden"
                      animate="show"
                    >
                      {filtered.map((c) => (
                        <motion.div key={c.id} variants={MODAL_LIST_STAGGER_ITEM}>
                          <button
                            type="button"
                            onClick={() => openProfileFromPreview(c)}
                            disabled={loadingCollaboratorId === c.id}
                            className="w-full flex items-center gap-4 p-3 rounded-2xl border border-border/40 bg-muted/10 hover:bg-muted/25 hover:border-border/60 transition-colors duration-200 text-left"
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
                              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                            ) : null}
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  );
                })() : sectorModalLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.35, ease: EASE_MODAL }}
                    className="flex flex-col items-center justify-center py-16 gap-3"
                  >
                    <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                    <span className="text-sm text-muted-foreground animate-pulse">Carregando aplicativos...</span>
                  </motion.div>
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
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: EASE_MODAL, delay: 0.06 }}
                        className="flex flex-col items-center justify-center py-16 gap-3"
                      >
                        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                          <Search className="w-5 h-5 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">Nenhum sistema encontrado.</p>
                      </motion.div>
                    );
                  }
                  return (
                    <motion.div
                      className="space-y-2.5"
                      variants={MODAL_LIST_STAGGER_CONTAINER}
                      initial="hidden"
                      animate="show"
                    >
                      {filtered.map((sys) => (
                        <motion.div key={sys.id} variants={MODAL_LIST_STAGGER_ITEM}>
                          <button
                            type="button"
                            onClick={() =>
                              setSectorModalSystems((prev) =>
                                prev.map((s) => (s.id === sys.id ? { ...s, canAccess: !s.canAccess } : s)),
                              )
                            }
                            className={`w-full flex items-center gap-4 p-3 rounded-2xl border transition-colors duration-200 text-left group/item relative overflow-hidden ${
                              sys.canAccess
                                ? 'bg-primary/5 border-primary/20 shadow-sm hover:bg-primary/10 hover:border-primary/30 hover:shadow-md'
                                : 'bg-muted/10 border-border/40 hover:bg-muted/30 hover:border-border/60 hover:shadow-sm'
                            }`}
                          >
                            {sys.canAccess && (
                              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-500" />
                            )}
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200 relative z-10 overflow-hidden border ${
                                sys.canAccess
                                  ? 'bg-primary/15 text-primary border-primary/20'
                                  : 'bg-muted/50 text-muted-foreground border-border/50'
                              }`}
                            >
                              {renderSystemIcon(sys.icon, 'w-6 h-6 object-contain')}
                            </div>
                            <div className="flex-1 min-w-0 relative z-10">
                              <p
                                className={`text-sm font-semibold truncate transition-colors duration-200 ${
                                  sys.canAccess
                                    ? 'text-foreground'
                                    : 'text-muted-foreground group-hover/item:text-foreground/80'
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
                              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 relative z-10 border-2 ${
                                sys.canAccess
                                  ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20 scale-110'
                                  : 'bg-transparent border-muted-foreground/30 text-transparent group-hover/item:border-muted-foreground/50 scale-100'
                              }`}
                            >
                              <Check
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${sys.canAccess ? 'scale-100' : 'scale-0'}`}
                                strokeWidth={3}
                              />
                            </div>
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="p-5 border-t border-border/40 bg-muted/20 shrink-0 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {sectorModalPanel === 'collaborators' ? (
                <p className="text-sm text-muted-foreground"></p>
              ) : (
                (() => {
                  const changedCount = sectorModalSystems.filter((s) => s.canAccess !== s.original).length;
                  const noProfiles = (sectorModalRow?.collaborators ?? []).length === 0;
                  if (noProfiles && !sectorModalLoading) {
                    return (
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Nenhum colaborador com perfil neste setor (mock) — cadastre ou vincule e-mails para simular acessos.
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
                })()
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" className="rounded-xl h-10 px-4" onClick={() => setSectorModalRow(null)}>
                Cancelar
              </Button>
              <Button
                className={`rounded-xl h-10 px-5 gap-2 transition-all duration-300 ${
                  sectorModalPanel === 'systems' &&
                  sectorModalSystems.some((s) => s.canAccess !== s.original) &&
                  !sectorModalSaving
                    ? 'shadow-lg shadow-primary/25 hover:shadow-primary/40'
                    : ''
                }`}
                onClick={handleSaveSectorAccess}
                disabled={
                  sectorModalPanel !== 'systems' ||
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
    </MainViewFluidShell>
  );
}
