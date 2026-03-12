// src/components/views/profile/ProfileInfo/Photo.jsx
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Photo({ 
  avatarPreview, 
  fullName, 
  isEditing, 
  onEditClick,
  getInitials 
}) {
  return (
    <div className="flex justify-center">
      <div className="relative group">
        <Avatar className="w-24 h-24 ring-2 ring-slate-200 dark:ring-slate-700 transition-all group-hover:ring-[#1A9386] overflow-hidden">
          <AvatarImage src={avatarPreview || undefined} className="object-cover" />
          <AvatarFallback className="bg-gradient-to-br from-[#1A9386] to-teal-600 text-white font-semibold">
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>
        
        {isEditing && (
          <div className={cn(
            "absolute bottom-0 right-0",
            "bg-[#1A9386] text-white",
            "rounded-full p-2",
            "shadow-lg shadow-[#1A9386]/40",
            "border-2 border-white dark:border-slate-800",
            "transition-all duration-200",
            "hover:scale-110 hover:shadow-xl hover:shadow-[#1A9386]/50",
            "z-10 cursor-pointer"
          )}
          onClick={onEditClick}
          title="Alterar foto de perfil"
          >
            <Camera className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
    </div>
  );
}