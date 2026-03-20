import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Users, RefreshCw, AlertCircle, Building2 } from 'lucide-react';
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
import { databaseService, type Team, type TeamLifecycleStatus } from '@/services/supabase';
import { toast } from 'sonner';
import { LoadingGif } from '@/components/LoadingGif';
import { TeamsEnrichedView, type TeamDisplayRow } from '@/components/teams/TeamsEnrichedView';
import { AdminEquipesTopicView, type SectorTopicRow } from '@/admin/components/AdminEquipesTopicView';
import { cn } from '@/lib/utils';

type EquipesTopicTab = 'departments' | 'sectors' | 'collaborators';

const TOPIC_DEPARTMENTS: EquipesTopicTab = 'departments';
const TOPIC_SECTORS: EquipesTopicTab = 'sectors';
const TOPIC_COLLABORATORS: EquipesTopicTab = 'collaborators';

function buildDisplayRows(
  teams: Team[],
  deptById: Map<string, NeonDepartment>,
  stats: Awaited<ReturnType<typeof getDepartmentTeamStats>>,
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
    };
  });
}

export default function AdminEquipesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [topicView, setTopicView] = useState<EquipesTopicTab>(TOPIC_DEPARTMENTS);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  const [teams, setTeams] = useState<Team[]>([]);
  const [departments, setDepartments] = useState<NeonDepartment[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDepartmentTeamStats>>>({});
  const [collaborators, setCollaborators] = useState<NeonTeamCollaborator[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [pendingStatusTeamId, setPendingStatusTeamId] = useState<string | null>(null);

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
    setTeams(teamsList);
    setDepartments(deptList);
    setStats(statsMap);
    setCollaborators(collabList);
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
    () => buildDisplayRows(teams, deptById, stats),
    [teams, deptById, stats],
  );

  const sectorTopicRows = useMemo((): SectorTopicRow[] => {
    const rows: SectorTopicRow[] = [];
    for (const t of teams) {
      const neon = deptById.get(t.neonDepartmentId);
      const st = stats[t.neonDepartmentId];
      if (!st?.sectors?.length) continue;
      const deptName = neon?.name?.trim() || t.name;
      for (const s of st.sectors) {
        rows.push({
          id: `${t.id}::${s}`,
          sectorName: s,
          departmentName: deptName,
          collaboratorCount: st.sectorCounts[s] ?? 0,
          icon: neon?.icon ?? null,
          color: neon?.color ?? null,
        });
      }
    }
    return rows.sort(
      (a, b) =>
        a.sectorName.localeCompare(b.sectorName, 'pt-BR') ||
        a.departmentName.localeCompare(b.departmentName, 'pt-BR'),
    );
  }, [teams, deptById, stats]);

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
    return collaborators.filter((c) => {
      if (!qq) return true;
      return (
        c.name.toLowerCase().includes(qq) ||
        c.email.toLowerCase().includes(qq) ||
        c.departmentName.toLowerCase().includes(qq) ||
        c.sectorName.toLowerCase().includes(qq)
      );
    });
  }, [collaborators, searchQuery]);

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
          <select
            className="h-9 max-w-[220px] sm:max-w-[280px] rounded-xl border border-border/60 bg-muted/50 px-3 py-1 text-sm font-medium shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background cursor-pointer truncate"
            value={topicView}
            onChange={(e) => setTopicView(e.target.value as EquipesTopicTab)}
            aria-label="Tipo de visualização"
            title={topicLabel}
          >
            <option value={TOPIC_DEPARTMENTS}>Departamentos</option>
            <option value={TOPIC_SECTORS}>Setores</option>
            <option value={TOPIC_COLLABORATORS}>Colaboradores</option>
          </select>
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
    </div>
  );
}
