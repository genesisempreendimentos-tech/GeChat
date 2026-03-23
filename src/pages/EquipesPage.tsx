import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, ChevronDown, Users, LayoutGrid, Table2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { databaseService, supabase, type Team } from '@/services/supabase';
import { getDepartments, getDepartmentTeamStats, getNeonCollaboratorsForTeamDepartments, type NeonDepartment, type NeonTeamCollaborator } from '@/services/corporateProfile';
import { TeamsEnrichedView, type TeamDisplayRow, type TeamCollaboratorPreview, type TeamsViewMode } from '@/components/teams/TeamsEnrichedView';
import { cn } from '@/lib/utils';

const FILTER_ALL = 'all';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [nameFilter, setNameFilter] = useState<string>(FILTER_ALL);
  const [viewMode, setViewMode] = useState<TeamsViewMode>('cards');

  const [teams, setTeams] = useState<Team[]>([]);
  const [departments, setDepartments] = useState<NeonDepartment[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDepartmentTeamStats>>>({});
  const [collaboratorsByDeptId, setCollaboratorsByDeptId] = useState<Map<string, TeamCollaboratorPreview[]>>(new Map());
  const [loading, setLoading] = useState(true);

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

    setTeams(teamsList);
    setDepartments(deptList);
    setStats(statsMap);
    setCollaboratorsByDeptId(collabMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const teamNamesFromDb = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const t of teams) {
      const neon = deptById.get(t.neonDepartmentId);
      const n = (neon?.name ?? t.name ?? '').trim();
      if (n && !seen.has(n)) {
        seen.add(n);
        list.push(n);
      }
    }
    return list.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [teams, deptById]);

  useEffect(() => {
    if (nameFilter !== FILTER_ALL && !teamNamesFromDb.includes(nameFilter)) {
      setNameFilter(FILTER_ALL);
    }
  }, [teamNamesFromDb, nameFilter]);

  const displayRowsAll = useMemo(
    () => buildDisplayRows(teams, deptById, stats, collaboratorsByDeptId),
    [teams, deptById, stats, collaboratorsByDeptId],
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return displayRowsAll.filter((row) => {
      const matchSearch =
        !q ||
        row.name.toLowerCase().includes(q) ||
        (row.description ?? '').toLowerCase().includes(q) ||
        row.sectors.some((s) => s.toLowerCase().includes(q));
      const matchName = nameFilter === FILTER_ALL || row.name === nameFilter;
      return matchSearch && matchName;
    });
  }, [displayRowsAll, searchQuery, nameFilter]);

  const filterDropdownLabel = nameFilter === FILTER_ALL ? 'Todas as equipes' : nameFilter;

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

      <div className="p-1 rounded-2xl bg-white/50 dark:bg-[#0d1520]/50 border border-slate-200 dark:border-white/5 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row gap-2 p-2 items-stretch lg:items-center">
          <div className="flex-1 relative group/search min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors duration-200" />
            <Input
              placeholder="Buscar equipes..."
              className="pl-11 h-12 rounded-xl border-border/60 bg-muted/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  className="min-w-[min(100vw-2rem,200px)] sm:min-w-[220px] h-12 justify-between border-border/60 bg-muted/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background rounded-xl"
                >
                  <div className="flex items-center min-w-0">
                    <Filter className="w-4 h-4 mr-2 shrink-0" />
                    <span className="truncate">{filterDropdownLabel}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[min(100vw-2rem,260px)] sm:min-w-[280px] max-w-[360px] max-h-[280px] overflow-y-auto bg-white dark:bg-[#0d1520] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
              >
                <DropdownMenuItem
                  onClick={() => setNameFilter(FILTER_ALL)}
                  className="focus:bg-primary/20 focus:text-primary cursor-pointer"
                >
                  Todas as equipes
                </DropdownMenuItem>
                {teamNamesFromDb.length === 0 ? (
                  <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                    Nenhuma equipe ativa cadastrada
                  </div>
                ) : (
                  teamNamesFromDb.map((name) => (
                    <DropdownMenuItem
                      key={name}
                      onClick={() => setNameFilter(name)}
                      className="focus:bg-primary/20 focus:text-primary cursor-pointer"
                    >
                      <span className="truncate">{name}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex rounded-xl border border-border/60 p-1 bg-muted/30 shadow-sm transition-colors hover:border-border/80 h-12 items-center">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-9 rounded-lg text-sm font-medium transition-all duration-300 flex items-center',
                  viewMode === 'table'
                    ? 'bg-primary text-primary-foreground shadow-md px-3'
                    : 'px-2 text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
              >
                <Table2 className="w-4 h-4 shrink-0" />
                <AnimatePresence initial={false}>
                  {viewMode === 'table' && (
                    <motion.span
                      initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                      animate={{ width: 'auto', opacity: 1, marginLeft: 6 }}
                      exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      Tabela
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-9 rounded-lg text-sm font-medium transition-all duration-300 flex items-center',
                  viewMode === 'cards'
                    ? 'bg-primary text-primary-foreground shadow-md px-3'
                    : 'px-2 text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
                onClick={() => setViewMode('cards')}
                aria-pressed={viewMode === 'cards'}
              >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <AnimatePresence initial={false}>
                  {viewMode === 'cards' && (
                    <motion.span
                      initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                      animate={{ width: 'auto', opacity: 1, marginLeft: 6 }}
                      exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      Cards
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <TeamsEnrichedView
        loading={loading}
        rows={filteredRows}
        viewMode={viewMode}
        variant="user"
        showStatusColumn={false}
        emptyTitle="Nenhuma equipe para exibir"
        emptyHint={
          searchQuery || nameFilter !== FILTER_ALL
            ? 'Tente ajustar a busca ou o filtro.'
            : 'Ainda não há equipes ativas. O administrador pode cadastrá-las no painel admin.'
        }
      />
    </div>
  );
}
