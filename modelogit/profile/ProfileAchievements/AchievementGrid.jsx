// src/components/views/profile/ProfileAchievements/AchievementGrid.jsx
import React from 'react';
import AchievementCard from './AchievementCard';

export default function AchievementGrid({ 
  achievements, 
  getAchievementStatus 
}) {
  // Organizar conquistas em grid 3x5 (3 linhas, 5 colunas)
  const grid = [[], [], []]; // 3 linhas
  
  achievements.forEach(achievement => {
    if (achievement.row >= 1 && achievement.row <= 3) {
      const status = getAchievementStatus(achievement.id);
      grid[achievement.row - 1].push({
        ...achievement,
        status
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Linha 1: START */}
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">
          START
        </h3>
        <div className="flex justify-center gap-4">
          {grid[0].map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              unlocked={achievement.status.unlocked}
              progress={achievement.status.progress}
            />
          ))}
        </div>
      </div>

      {/* Linha 2: TEMPO */}
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">
          TEMPO
        </h3>
        <div className="flex justify-center gap-4">
          {grid[1].map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              unlocked={achievement.status.unlocked}
              progress={achievement.status.progress}
            />
          ))}
        </div>
      </div>

      {/* Linha 3: TAREFAS */}
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">
          TAREFAS
        </h3>
        <div className="flex justify-center gap-4">
          {grid[2].map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              unlocked={achievement.status.unlocked}
              progress={achievement.status.progress}
            />
          ))}
        </div>
      </div>
    </div>
  );
}