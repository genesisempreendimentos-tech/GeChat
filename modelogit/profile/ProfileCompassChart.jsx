// Gráfico de radar em formato de bússola mostrando áreas onde o usuário mais conclui tarefas
import React, { useMemo } from 'react';
import { Radar } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Compass } from 'lucide-react';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import '@/lib/chartConfig';

// Função para traduzir nomes de cores para português com capitalização correta
const translateColor = (color) => {
  if (!color) return '';
  
  // Converter para string e remover espaços extras
  const colorStr = String(color).trim();
  
  // Se for código hexadecimal, retornar como está
  if (colorStr.startsWith('#')) return colorStr;
  
  // Se for formato rgb/rgba/hsl, retornar como está
  if (colorStr.startsWith('rgb') || colorStr.startsWith('hsl')) return colorStr;
  
  // Traduzir nomes de cores comuns (mapeamento completo)
  const colorMap = {
    'purple': 'roxo',
    'red': 'vermelho',
    'blue': 'azul',
    'green': 'verde',
    'yellow': 'amarelo',
    'orange': 'laranja',
    'pink': 'rosa',
    'cyan': 'ciano',
    'magenta': 'magenta',
    'brown': 'marrom',
    'black': 'preto',
    'white': 'branco',
    'gray': 'cinza',
    'grey': 'cinza',
    'teal': 'verde-água',
    'indigo': 'anil',
    'violet': 'violeta',
    'lime': 'lima',
    'navy': 'azul-marinho',
    'olive': 'oliva',
    'silver': 'prata',
    'gold': 'dourado',
    'coral': 'coral',
    'salmon': 'salmão',
    'turquoise': 'turquesa',
    'lavender': 'lavanda',
    'maroon': 'marrom escuro',
    'beige': 'bege',
    'tan': 'bronzeado',
    'ivory': 'marfim',
    'khaki': 'caqui',
    'dark red': 'vermelho escuro',
    'dark blue': 'azul escuro',
    'dark green': 'verde escuro',
    'dark purple': 'roxo escuro',
    'light blue': 'azul claro',
    'light green': 'verde claro',
    'light gray': 'cinza claro',
    'light grey': 'cinza claro',
    'dark gray': 'cinza escuro',
    'dark grey': 'cinza escuro',
    'deep red': 'vermelho profundo',
    'deep blue': 'azul profundo',
    'bright red': 'vermelho brilhante',
    'bright blue': 'azul brilhante',
    'light red': 'vermelho claro',
    'light pink': 'rosa claro',
    'dark pink': 'rosa escuro',
    'deep purple': 'roxo profundo',
    'bright green': 'verde brilhante',
    'dark brown': 'marrom escuro',
    'light brown': 'marrom claro'
  };
  
  // Normalizar: remover espaços extras e converter para minúsculas
  const lowerColor = colorStr.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Buscar tradução no mapa (busca exata primeiro)
  let translated = colorMap[lowerColor];
  
  // Se não encontrou, tentar buscar por palavra-chave (ex: "red" em "darkred")
  if (!translated) {
    // Tentar encontrar correspondência parcial (buscar cores compostas primeiro)
    const sortedKeys = Object.keys(colorMap).sort((a, b) => b.length - a.length); // Ordenar por tamanho (maior primeiro)
    for (const key of sortedKeys) {
      if (lowerColor.includes(key) || key.includes(lowerColor)) {
        translated = colorMap[key];
        break;
      }
    }
  }
  
  // Se ainda não encontrou, usar o valor original mas capitalizado
  if (!translated) {
    translated = colorStr;
  }
  
  // Capitalizar primeira letra de cada palavra
  return translated
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function ProfileCompassChart({ userTasks, areas = [], areasSummary = [] }) {
  const { theme } = useUserPreferences();
  const isDark = theme === 'dark';
  
  const chartData = useMemo(() => {
    // Se areasSummary foi fornecido via RPC, usar ele (mais preciso)
    if (areasSummary && areasSummary.length > 0) {
      const sortedAreas = areasSummary
        .sort((a, b) => b.completed_tasks_count - a.completed_tasks_count)
        .slice(0, 6);

      if (sortedAreas.length === 0) {
        return null;
      }

      // Mapear áreas com seus dados completos (nome, cor, ícone)
      const areaData = sortedAreas.map(area => {
        // Buscar dados completos da área na lista de áreas
        const areaObj = areas.find(a => a.id === area.area_id || a.name === area.area_name) || {};
        return {
          id: area.area_id,
          name: area.area_name,
          color: areaObj.color || '#1A9386',
          icon: areaObj.icon || null,
          count: area.completed_tasks_count
        };
      });

      const labels = areaData.map(a => a.name);
      const values = areaData.map(a => a.count);
      const maxValue = Math.max(...values, 1);

      // Normalizar valores para 0-100
      const normalizedValues = values.map(v => (v / maxValue) * 100);

      // Gerar cores para cada área
      const areaColors = areaData.map(a => {
        // Se a área tem cor definida, usar ela, senão gerar cor baseada no nome
        if (a.color && a.color !== '#1A9386') {
          return a.color;
        }
        // Gerar cor baseada no hash do nome
        let hash = 0;
        for (let i = 0; i < a.name.length; i++) {
          hash = a.name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 70%, 50%)`;
      });

      return {
        labels,
        datasets: [
          {
            label: 'Tarefas Concluídas',
            data: normalizedValues,
            backgroundColor: '#1A938633', // Cor da marca com transparência
            borderColor: '#1A9386', // Cor da marca
            borderWidth: 2,
            pointBackgroundColor: areaColors, // Manter cores das áreas nos pontos
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: areaColors,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
        ],
        areaData, // Armazenar dados completos para uso no tooltip
      };
    }

    // Fallback: processar áreas manualmente se RPC não estiver disponível
    if (!userTasks || userTasks.length === 0) {
      return null;
    }

    // Agrupar tarefas concluídas por área
    const areaStats = {};
    
    userTasks
      .filter(task => task.status === 'completed')
      .forEach(task => {
        // Tentar obter o nome da área de várias formas
        let areaName = 'Sem Área';
        
        if (task.area_name) {
          areaName = task.area_name;
        } else if (task.area) {
          areaName = typeof task.area === 'string' ? task.area : task.area.name || 'Sem Área';
        } else if (task.area_id && areas.length > 0) {
          const areaObj = areas.find(a => a.id === task.area_id);
          areaName = areaObj?.name || 'Sem Área';
        } else if (task.area_display) {
          areaName = task.area_display;
        }

        if (!areaStats[areaName]) {
          areaStats[areaName] = 0;
        }
        areaStats[areaName]++;
      });

    // Ordenar por quantidade e pegar as top 6 áreas
    const sortedAreas = Object.entries(areaStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);

    if (sortedAreas.length === 0) {
      return null;
    }

    // Mapear áreas com seus dados completos (nome, cor, ícone)
    const areaData = sortedAreas.map(([name]) => {
      // Buscar dados completos da área na lista de áreas
      const areaObj = areas.find(a => a.name === name) || {};
      return {
        name,
        color: areaObj.color || '#1A9386',
        icon: areaObj.icon || null,
        count: areaStats[name]
      };
    });

    const labels = areaData.map(a => a.name);
    const values = areaData.map(a => a.count);
    const maxValue = Math.max(...values, 1);

    // Normalizar valores para 0-100
    const normalizedValues = values.map(v => (v / maxValue) * 100);

    // Gerar cores para cada área
    const areaColors = areaData.map(a => {
      // Se a área tem cor definida, usar ela, senão gerar cor baseada no nome
      if (a.color && a.color !== '#1A9386') {
        return a.color;
      }
      // Gerar cor baseada no hash do nome
      let hash = 0;
      for (let i = 0; i < a.name.length; i++) {
        hash = a.name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const hue = Math.abs(hash) % 360;
      return `hsl(${hue}, 70%, 50%)`;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Tarefas Concluídas',
          data: normalizedValues,
          backgroundColor: '#1A938633', // Cor da marca com transparência
          borderColor: '#1A9386', // Cor da marca
          borderWidth: 2,
          pointBackgroundColor: areaColors, // Manter cores das áreas nos pontos
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: areaColors,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
      areaData, // Armazenar dados completos para uso no tooltip
    };
  }, [areasSummary, userTasks, areas]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: function(context) {
            const index = context[0].dataIndex;
            const areaData = chartData?.areaData || [];
            const area = areaData[index];
            if (area) {
              return `${area.name} (${area.count} tarefa${area.count !== 1 ? 's' : ''})`;
            }
            return context[0].label || '';
          },
          label: function(context) {
            const index = context.dataIndex;
            const areaData = chartData?.areaData || [];
            const area = areaData[index];
            if (area && area.color) {
              // Garantir que a cor seja traduzida
              const colorToTranslate = String(area.color).trim();
              const translatedColor = translateColor(colorToTranslate);
              return [
                `Área: ${area.name}`,
                `Tarefas concluídas: ${area.count}`
              ].filter(Boolean);
            } else if (area) {
              return [
                `Área: ${area.name}`,
                `Tarefas concluídas: ${area.count}`
              ];
            }
            return `${context.label}: ${context.parsed.r}%`;
          },
          labelColor: function(context) {
            const index = context.dataIndex;
            const areaData = chartData?.areaData || [];
            const area = areaData[index];
            if (area && area.color) {
              return {
                borderColor: area.color,
                backgroundColor: area.color,
              };
            }
            return {
              borderColor: 'rgba(26, 147, 134, 1)',
              backgroundColor: 'rgba(26, 147, 134, 1)',
            };
          },
        },
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: isDark ? '#fff' : '#000',
        bodyColor: isDark ? '#fff' : '#000',
        borderColor: isDark ? 'rgba(26, 147, 134, 0.5)' : 'rgba(26, 147, 134, 0.3)',
        borderWidth: 1,
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        min: 0,
        ticks: {
          stepSize: 20,
          display: false, // Remover porcentagens da parte de trás
          color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
          font: {
            size: 10,
          },
        },
        grid: {
          color: isDark ? 'rgba(26, 147, 134, 0.2)' : 'rgba(26, 147, 134, 0.15)',
        },
        pointLabels: {
          color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
          font: {
            size: 11,
            weight: '500',
          },
          callback: function(label, index) {
            // Retornar nome da área
            return label;
          },
        },
        angleLines: {
          color: isDark ? 'rgba(26, 147, 134, 0.3)' : 'rgba(26, 147, 134, 0.2)',
        },
      },
    },
  }), [chartData, isDark]);

  if (!chartData) {
    return (
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 font-semibold">
            <div className="p-1.5 rounded-lg bg-[#1A9386]/10 dark:bg-[#1A9386]/20">
              <Compass className="w-4 h-4 text-[#1A9386]" />
            </div>
            Bússola de Áreas
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Áreas onde mais conclui tarefas
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
            <Compass className="w-4 h-4 text-[#1A9386]" />
          </div>
          Bússola de Áreas
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Áreas onde mais conclui tarefas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          <div className="w-full max-w-[400px]">
            <Radar data={chartData} options={options} />
          </div>
          
          {/* Legenda com ícones/cores/nomes das áreas */}
          {chartData?.areaData && chartData.areaData.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-[400px] mt-4">
              {chartData.areaData.map((area, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  style={{ borderLeft: `3px solid ${area.color || '#1A9386'}` }}
                >
                  {/* Ícone da área (se disponível) */}
                  {area.icon && (
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: area.color || '#1A9386' }}
                    />
                  )}
                  {/* Nome e contagem */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: area.color || '#1A9386' }}>
                      {area.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {area.count} tarefa{area.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

