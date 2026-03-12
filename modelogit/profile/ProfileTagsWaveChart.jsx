// Gráfico de onda mostrando as tags mais usadas
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tags } from 'lucide-react';
import { motion } from 'framer-motion';
import '@/lib/chartConfig';
import { supabase } from '@/lib/customSupabaseClient';

const BRAND_COLOR = '#1A9386';

export default function ProfileTagsWaveChart({ userTasks, userId, tagsSummary = [] }) {
  const chartRef = useRef(null);
  const [tags, setTags] = useState([]);

  // Detectar tema escuro/claro
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark') || 
           window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(
        document.documentElement.classList.contains('dark') || 
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    };

    // Observar mudanças na classe dark
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Observar mudanças na preferência do sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);

    checkTheme();

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkTheme);
    };
  }, []);

  // Buscar tags do usuário
  useEffect(() => {
    const fetchTags = async () => {
      if (!userId) return;
      try {
        const { data } = await supabase
          .from('tags')
          .select('*')
          .eq('user_id', userId)
          .order('name', { ascending: true });
        setTags(data || []);
      } catch (error) {
        console.error('Erro ao buscar tags:', error);
        setTags([]);
      }
    };
    fetchTags();
  }, [userId]);

  const chartData = useMemo(() => {
    // Se tagsSummary foi fornecido via RPC, usar ele (mais preciso)
    if (tagsSummary && tagsSummary.length > 0) {
      const sortedTags = tagsSummary
        .sort((a, b) => b.use_count - a.use_count)
        .slice(0, 8);

      if (sortedTags.length === 0) {
        return null;
      }

      const labels = sortedTags.map(tag => tag.tag_name);
      const values = sortedTags.map(tag => tag.use_count);
      const maxValue = Math.max(...values, 1);
      const normalizedValues = values.map(v => (v / maxValue) * 100);

      return {
        labels,
        datasets: [
          {
            label: 'Uso de Tags',
            data: normalizedValues,
            borderColor: BRAND_COLOR,
            backgroundColor: (context) => {
              const chart = context.chart;
              const { ctx, chartArea } = chart;
              
              if (!chartArea) {
                return 'rgba(26, 147, 134, 0.1)';
              }

              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, 'rgba(26, 147, 134, 0.4)');
              gradient.addColorStop(0.5, 'rgba(26, 147, 134, 0.2)');
              gradient.addColorStop(1, 'rgba(26, 147, 134, 0.05)');
              
              return gradient;
            },
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 8,
            pointBackgroundColor: BRAND_COLOR,
            pointBorderColor: '#fff',
            pointBorderWidth: 3,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: BRAND_COLOR,
            pointHoverBorderWidth: 3,
          },
        ],
        realValues: values, // Valores reais para tooltip
      };
    }

    // Fallback: processar tags manualmente se RPC não estiver disponível
    if (!userTasks || userTasks.length === 0) {
      return null;
    }

    // Agrupar tarefas concluídas por tags
    const tagStats = {};
    
    userTasks
      .filter(task => task.status === 'completed')
      .forEach(task => {
        // Tentar obter tags de várias formas
        let taskTags = [];
        
        // 1. Tentar tags_display (array ou string JSON)
        if (task.tags_display) {
          if (Array.isArray(task.tags_display)) {
            taskTags = task.tags_display;
          } else if (typeof task.tags_display === 'string') {
            try {
              const parsed = JSON.parse(task.tags_display);
              taskTags = Array.isArray(parsed) ? parsed : [parsed];
            } catch {
              // Se não for JSON, tratar como string simples
              taskTags = task.tags_display.split(',').map(t => t.trim()).filter(Boolean);
            }
          }
        }
        
        // 2. Tentar tags (array ou string JSON)
        if (taskTags.length === 0 && task.tags) {
          if (Array.isArray(task.tags)) {
            taskTags = task.tags;
          } else if (typeof task.tags === 'string') {
            try {
              const parsed = JSON.parse(task.tags);
              taskTags = Array.isArray(parsed) ? parsed : [parsed];
            } catch {
              taskTags = task.tags.split(',').map(t => t.trim()).filter(Boolean);
            }
          }
        }

        // 3. Se não encontrou tags, verificar tag_ids (array de IDs)
        if (taskTags.length === 0 && task.tag_ids && Array.isArray(task.tag_ids) && tags.length > 0) {
          taskTags = task.tag_ids
            .map(tagId => {
              const tagObj = tags.find(t => t.id === tagId);
              return tagObj?.name;
            })
            .filter(Boolean);
        }

        // 4. Se não encontrou tags, verificar tag_id (ID único)
        if (taskTags.length === 0 && task.tag_id && tags.length > 0) {
          const tagObj = tags.find(t => t.id === task.tag_id);
          if (tagObj) {
            taskTags = [tagObj.name];
          }
        }

        // 5. Se ainda não encontrou, verificar se há tags relacionadas na view
        if (taskTags.length === 0 && task.tags_resolved) {
          if (Array.isArray(task.tags_resolved)) {
            taskTags = task.tags_resolved.map(t => t.name || t).filter(Boolean);
          } else if (typeof task.tags_resolved === 'string') {
            try {
              const parsed = JSON.parse(task.tags_resolved);
              taskTags = Array.isArray(parsed) ? parsed.map(t => t.name || t) : [parsed.name || parsed];
            } catch {
              taskTags = [task.tags_resolved];
            }
          }
        }

        // Contar cada tag
        taskTags.forEach(tagName => {
          if (!tagName) return;
          const tag = String(tagName).trim();
          if (tag && tag !== 'null' && tag !== 'undefined') {
            if (!tagStats[tag]) {
              tagStats[tag] = 0;
            }
            tagStats[tag]++;
          }
        });
      });

    // Ordenar por quantidade e pegar as top 8 tags
    const sortedTags = Object.entries(tagStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);

    if (sortedTags.length === 0) {
      return null;
    }

    const labels = sortedTags.map(([name]) => name);
    const values = sortedTags.map(([, count]) => count);
    const maxValue = Math.max(...values, 1);

    // Normalizar valores para melhor visualização (0-100)
    const normalizedValues = values.map(v => (v / maxValue) * 100);

      return {
        labels,
        datasets: [
          {
            label: 'Uso de Tags',
            data: normalizedValues,
            borderColor: BRAND_COLOR,
            backgroundColor: (context) => {
              const chart = context.chart;
              const { ctx, chartArea } = chart;
              
              if (!chartArea) {
                return 'rgba(26, 147, 134, 0.1)';
              }

              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, 'rgba(26, 147, 134, 0.4)');
              gradient.addColorStop(0.5, 'rgba(26, 147, 134, 0.2)');
              gradient.addColorStop(1, 'rgba(26, 147, 134, 0.05)');
              
              return gradient;
            },
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 8,
            pointBackgroundColor: BRAND_COLOR,
            pointBorderColor: '#fff',
            pointBorderWidth: 3,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: BRAND_COLOR,
            pointHoverBorderWidth: 3,
          },
        ],
        // Armazenar valores reais para tooltip
        realValues: values,
      };
  }, [tagsSummary, userTasks, tags]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          font: { size: 11 },
          color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.6)',
          callback: function(value) {
            return value + '%';
          },
        },
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.03)',
          drawBorder: false,
        },
      },
      x: {
        ticks: {
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 45,
          color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.6)',
        },
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        padding: 14,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        borderColor: BRAND_COLOR,
        borderWidth: 2,
        cornerRadius: 10,
        displayColors: true,
        callbacks: {
          label: (context) => {
            const index = context.dataIndex;
            const realValue = chartData?.realValues?.[index] || 0;
            const percentage = context.parsed.y.toFixed(1);
            return [
              `${realValue} tarefa${realValue !== 1 ? 's' : ''}`,
              `${percentage}% do máximo`,
            ];
          },
          title: (context) => {
            return context[0].label || '';
          },
        },
      },
    },
    animation: {
      duration: 2500,
      easing: 'easeOutQuart',
      delay: 300,
    },
  }), [isDarkMode, chartData]);

  if (!chartData) {
    return (
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 font-semibold">
            <div className="p-1.5 rounded-lg bg-[#1A9386]/10 dark:bg-[#1A9386]/20">
              <Tags className="w-4 h-4 text-[#1A9386]" />
            </div>
            Tags Mais Usadas
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Tags mais utilizadas em tarefas concluídas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-sm text-muted-foreground">Sem dados suficientes para exibir</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 font-semibold">
          <div className="p-1.5 rounded-lg bg-[#1A9386]/10 dark:bg-[#1A9386]/20">
            <Tags className="w-4 h-4 text-[#1A9386]" />
          </div>
          Tags Mais Usadas
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Tags mais utilizadas em tarefas concluídas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="h-[300px] bg-gradient-to-br from-card via-card to-card/95 rounded-lg p-6 border border-border relative overflow-hidden"
        >
          {/* Efeito de brilho sutil no fundo */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-transparent pointer-events-none" />
          
          {/* Efeito de onda animada no fundo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.1, 0.15, 0.1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(26, 147, 134, 0.08) 0%, transparent 70%)',
            }}
          />

          {/* Gráfico de linha com onda */}
          <div className="relative z-10">
            <Line 
              ref={chartRef}
              data={chartData} 
              options={options}
              plugins={[{
                id: 'waveGradient',
                beforeDraw: (chart) => {
                  const { ctx } = chart;
                  if (!ctx) return;

                  // Adicionar sombra suave na linha
                  ctx.save();
                  ctx.shadowColor = 'rgba(26, 147, 134, 0.3)';
                  ctx.shadowBlur = 15;
                  ctx.shadowOffsetX = 0;
                  ctx.shadowOffsetY = 4;
                },
                afterDraw: (chart) => {
                  const { ctx } = chart;
                  if (ctx) {
                    ctx.restore();
                  }
                }
              }]}
            />
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}

