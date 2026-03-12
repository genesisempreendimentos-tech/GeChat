// src/components/views/profile/ProfileTabs/ProfileAchievements.jsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { useAchievements } from '../ProfileAchievements/useAchievements';
import AchievementGrid from '../ProfileAchievements/AchievementGrid';

export default function ProfileAchievements() {
  const { 
    achievements, 
    getAchievementStatus, 
    loading 
  } = useAchievements();

  if (loading) {
    return (
      <Card className="bg-[#D5D9E0] dark:bg-[#1E293B] border border-slate-400 dark:border-slate-700">
        <CardContent className="p-6">
          <div className="text-center">Carregando conquistas...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#D5D9E0] dark:bg-[#1E293B] border border-slate-400 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="text-slate-700 dark:text-slate-300" />
          Conquistas
        </CardTitle>
      </CardHeader>

      <CardContent>
        <AchievementGrid 
          achievements={Object.values(achievements)}
          getAchievementStatus={getAchievementStatus}
        />
      </CardContent>
    </Card>
  );
}