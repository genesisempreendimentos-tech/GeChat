// Componente para visualização pública do perfil de outro usuário
import React, { useMemo, useState, useEffect } from 'react';
import { useTask } from '@/contexts/TaskContext.jsx';
import { useTeams } from '@/contexts/TeamContext.jsx';
// import { useAreas } from '@/contexts/AreaContext.jsx'; // Se não existir, buscar áreas diretamente
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  CheckCircle, 
  Clock, 
  Timer, 
  Rocket, 
  GitBranch, 
  TrendingUp,
  Target
} from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { toDate } from 'date-fns-tz';
import BigBox from '@/components/ui/BigBox';
import ViewBadgeCount from '@/components/ui/ViewBadgeCount';
import ProfileCompassChart from './ProfileCompassChart';
import ProfileTagsWaveChart from './ProfileTagsWaveChart';
import MagicBento from './MagicBento';

const TIME_ZONE = 'America/Sao_Paulo';
const BRAND_COLOR = '#1A9386';

export default function ProfilePublicView({ userData }) {
  const { teams } = useTeams();
  const [areas, setAreas] = useState([]);
  const [areasSummary, setAreasSummary] = useState([]); // Áreas agregadas via RPC
  const [userTasks, setUserTasks] = useState([]);
  const [tagsSummary, setTagsSummary] = useState([]); // Tags agregadas via RPC
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    totalTime: 0,
    projects: 0,
    flows: 0,
    teams: 0,
  });
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState([]);

  // Buscar todos os dados do perfil público usando RPC única
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userData?.id) {
        setUserTasks([]);
        setAreasSummary([]);
        setTagsSummary([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        
        // Usar função RPC única que retorna tudo
        const { data: profileData, error } = await supabase.rpc(
          'get_public_profile_full',
          { target_user: userData.id }
        );

        if (error) {
          console.error('Erro ao buscar dados do perfil via RPC:', error);
          setUserTasks([]);
          setAreasSummary([]);
          setTagsSummary([]);
          setLoading(false);
          return;
        }

        if (!profileData) {
          console.warn('Nenhum dado retornado do RPC');
          setUserTasks([]);
          setAreasSummary([]);
          setTagsSummary([]);
          setLoading(false);
          return;
        }

        // Processar dados retornados
        setUserTasks(profileData.tasks || []);
        setAreasSummary(profileData.areas || []);
        setTagsSummary(profileData.tags || []);

        // Buscar áreas completas para o gráfico (com cores, ícones, etc.)
        try {
          const { data: areasData } = await supabase
            .from('areas')
            .select('*')
            .eq('user_id', userData.id)
            .order('name', { ascending: true });
          setAreas(areasData || []);
        } catch (areasError) {
          console.warn('Erro ao buscar áreas completas:', areasError);
          setAreas([]);
        }

        // Buscar equipes do usuário (similar ao Dashboard)
        let userTeamIds = [];
        let userTeamsCount = 0;
        
        try {
          // Buscar team_ids do usuário através de team_members
          const { data: teamMembersData, error: teamMembersError } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', userData.id)
            .eq('status', 'accepted');

          if (!teamMembersError && teamMembersData) {
            userTeamIds = teamMembersData
              .map(tm => tm.team_id)
              .filter(Boolean);
            
            // Buscar informações das equipes para contar apenas ativas
            if (userTeamIds.length > 0) {
              const { data: teamsData } = await supabase
                .from('teams')
                .select('id, status')
                .in('id', userTeamIds);
              
              // Contar equipes ativas
              userTeamsCount = teamsData?.filter(t => {
                const status = t?.status || 'active';
                return status === 'active';
              }).length || 0;
            }
          }
        } catch (teamsError) {
          console.warn('Erro ao buscar equipes:', teamsError);
        }

        // Buscar projetos e fluxos - do usuário e de equipes que ele participa (igual ao Dashboard)
        let allProjects = [];
        let allFlows = [];
        
        try {
          // Buscar projetos - do usuário e de equipes
          const ownProjectsRes = await supabase
            .from('projects')
            .select('id, name, status, created_at')
            .eq('user_id', userData.id)
            .in('status', ['active', 'completed'])
            .order('created_at', { ascending: false })
            .limit(100);

          const teamProjectsRes = userTeamIds.length > 0
            ? await supabase
              .from('projects')
              .select('id, name, status, created_at')
              .in('team_id', userTeamIds)
              .in('status', ['active', 'completed'])
              .order('created_at', { ascending: false })
              .limit(100)
            : { data: [], error: null };

          // Mesclar projetos (removendo duplicatas)
          const projectsMap = new Map();
          [...(ownProjectsRes?.data || []), ...(teamProjectsRes?.data || [])].forEach(project => {
            if (project?.id) projectsMap.set(project.id, project);
          });
          allProjects = Array.from(projectsMap.values());

          // Buscar flows - do usuário e de equipes
          try {
            const ownFlowsRes = await supabase
              .from('flow')
              .select('id, name, status, created_at')
              .eq('user_id', userData.id)
              .in('status', ['active', 'completed'])
              .order('created_at', { ascending: false })
              .limit(100);

            const teamFlowsRes = userTeamIds.length > 0
              ? await supabase
                .from('flow')
                .select('id, name, status, created_at')
                .in('team_id', userTeamIds)
                .in('status', ['active', 'completed'])
                .order('created_at', { ascending: false })
                .limit(100)
              : { data: [], error: null };

            // Mesclar flows (removendo duplicatas)
            const flowsMap = new Map();
            [...(ownFlowsRes?.data || []), ...(teamFlowsRes?.data || [])].forEach(flow => {
              if (flow?.id) flowsMap.set(flow.id, flow);
            });
            allFlows = Array.from(flowsMap.values());
          } catch (flowsError) {
            console.warn('Erro ao preparar query de flows:', flowsError);
          }
        } catch (e) {
          console.warn('Erro ao buscar projetos/flows:', e);
        }

        // Atualizar stats com dados do RPC e projetos/flows/equipes buscados
        // time_invested já considera time_blocks (calculado na função RPC)
        setStats(prev => ({
          ...prev,
          totalTasks: profileData.tasks?.length || 0,
          completedTasks: profileData.tasks?.length || 0, // Todas são concluídas
          totalTime: profileData.time_invested?.total_ms || 0, // Já considera time_blocks via RPC
          projects: allProjects.length || 0, // Inclui projetos pessoais e de equipes
          flows: allFlows.length || 0, // Inclui fluxos pessoais e de equipes
          teams: userTeamsCount || 0, // Equipes ativas que o usuário participa
        }));

      } catch (error) {
        console.error('Erro ao buscar dados do perfil:', error);
        setUserTasks([]);
        setAreasSummary([]);
        setTagsSummary([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [userData?.id]);

  // Calcular dados semanais e estatísticas adicionais
  useEffect(() => {
    if (!userTasks || userTasks.length === 0) {
      setWeeklyData([]);
      return;
    }

    // Contar equipes do usuário
    const userTeams = teams?.filter(t => 
      t.members?.some(m => m.user?.id === userData.id)
    ) || [];

    // Calcular dados semanais
    const now = new Date();
    const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 });
    const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 });
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfCurrentWeek);
      day.setDate(day.getDate() + i);
      weekDays.push(day);
    }

    const weeklyStats = weekDays.map(day => {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const dayTasks = userTasks.filter(task => {
        if (!task.date && !task.completed_at) return false;
        try {
          const taskDate = task.completed_at 
            ? toDate(task.completed_at, { timeZone: TIME_ZONE })
            : toDate(task.date, { timeZone: TIME_ZONE });
          return isWithinInterval(taskDate, { start: dayStart, end: dayEnd });
        } catch (e) {
          return false;
        }
      });

      const completed = dayTasks.filter(t => t.status === 'completed').length;
      const timeSpent = dayTasks.reduce((sum, t) => sum + (t.time_spent_ms || 0), 0);

      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const dayIndex = day.getDay();

      return {
        day: dayNames[dayIndex],
        completed,
        timeSpent,
        total: dayTasks.length,
      };
    });

    // Atualizar stats com equipes
    setStats(prev => ({
      ...prev,
      teams: userTeams.length,
    }));

    setWeeklyData(weeklyStats);
  }, [userTasks, teams, userData?.id]);

  // Calcular informações interessantes sobre o usuário (ANTES do early return)
  const interestingStats = useMemo(() => {
    if (!weeklyData || weeklyData.length === 0) {
      return {
        avgTasksPerWeek: 0,
        bestDay: null,
        streak: 0,
      };
    }

    const avgTasksPerWeek = weeklyData.length > 0 
      ? Math.round(weeklyData.reduce((sum, d) => sum + d.completed, 0) / weeklyData.length)
      : 0;
    
    const bestDay = weeklyData.length > 0 && weeklyData.some(d => d.completed > 0)
      ? weeklyData.reduce((best, day) => day.completed > best.completed ? day : best, weeklyData[0])
      : null;

    const streak = (() => {
      let count = 0;
      const today = new Date();
      // Verificar os últimos 30 dias, começando de hoje
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        checkDate.setHours(0, 0, 0, 0);
        const dayEnd = new Date(checkDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        const dayTasks = userTasks.filter(task => {
          if (task.status !== 'completed') return false;
          if (!task.completed_at && !task.date) return false;
          try {
            const taskDate = task.completed_at 
              ? toDate(task.completed_at, { timeZone: TIME_ZONE })
              : toDate(task.date, { timeZone: TIME_ZONE });
            return isWithinInterval(taskDate, { start: checkDate, end: dayEnd });
          } catch (e) {
            return false;
          }
        });
        
        if (dayTasks.length > 0) {
          count++;
        } else if (i === 0) {
          // Se hoje não tem tarefas, não conta como streak
          break;
        } else {
          // Se um dia passado não tem tarefas, para o streak
          break;
        }
      }
      return count;
    })();

    return {
      avgTasksPerWeek,
      bestDay,
      streak,
    };
  }, [weeklyData, userTasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Carregando estatísticas...</p>
      </div>
    );
  }


  // Layout inspirado nas imagens: mais limpo e organizado
  return (
    <div className="space-y-6">
      {/* Linha 1: Magic Bento (movido para cima) */}
      <div className="w-full">
        <MagicBento
          cardData={[
            {
              title: 'Tarefas Completadas',
              description: `${stats.completedTasks} tarefas finalizadas`,
              label: 'Produtividade'
            },
            {
              title: 'Tempo Investido',
              description: `${formatTime(stats.totalTime)} de trabalho registrado`,
              label: 'Dedicação'
            },
            {
              title: 'Projetos, Fluxos',
              description: `${stats.projects} projeto${stats.projects !== 1 ? 's' : ''} e ${stats.flows} fluxo${stats.flows !== 1 ? 's' : ''} em andamento`,
              label: 'Atividades'
            },
          ]}
          textAutoHide={true}
          enableStars={true}
          enableSpotlight={true}
          enableBorderGlow={true}
          enableTilt={true}
          enableMagnetism={false}
          clickEffect={true}
          spotlightRadius={300}
          particleCount={12}
          glowColor="26, 147, 134"
        />
      </div>

      {/* Linha 2: Gráfico de Bússola + Gráfico de Onda de Tags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Bússola */}
        <ProfileCompassChart 
          userTasks={userTasks} 
          areas={areas}
          areasSummary={areasSummary} // Passar áreas agregadas via RPC
        />

        {/* Gráfico de Onda de Tags */}
        <ProfileTagsWaveChart 
          userTasks={userTasks} 
          userId={userData?.id}
          tagsSummary={tagsSummary} // Passar tags agregadas via RPC
        />
      </div>

    </div>
  );
}
