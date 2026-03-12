// src/components/views/profile/ProfileAchievements/AchievementCard.jsx
import React from 'react';

export default function AchievementCard({ 
  achievement, 
  unlocked, 
  progress 
}) {
  const {
    title,
    icon_locked,
    icon_unlocked,
    requirement
  } = achievement;

  const isFullyUnlocked = unlocked && progress >= requirement.target;
  
  return (
    <div className="relative">
      {/* Imagem da conquista */}
      <img
        src={unlocked ? icon_unlocked : icon_locked}
        alt={title}
        className="w-16 h-16 object-contain transition-all duration-300 hover:scale-110"
      />

      {/* Overlay de progresso (se não estiver totalmente desbloqueado) */}
      {!isFullyUnlocked && progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1">
          <div className="w-full bg-gray-600 rounded-full h-1">
            <div 
              className="bg-green-400 h-1 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((progress / requirement.target) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Indicador de desbloqueado */}
      {isFullyUnlocked && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">✓</span>
        </div>
      )}
    </div>
  );
}