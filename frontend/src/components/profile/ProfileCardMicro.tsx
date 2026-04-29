import React from 'react';
import { Info } from 'lucide-react';

interface ProfileCardMicroProps {
  name: string;
  username: string;
  avatarUrl: string;
  onInfoClick: () => void;
}

const ProfileCardMicro: React.FC<ProfileCardMicroProps> = ({
  name,
  username,
  onInfoClick
}) => {
  return (
    <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-semibold text-sm truncate">{name}</h3>
        <p className="text-gray-300 text-xs truncate">@{username}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onInfoClick();
        }}
        className="ml-2 p-1.5 rounded-full hover:bg-white/20 transition-colors"
        aria-label="Ver informações"
      >
        <Info className="w-4 h-4 text-white" />
      </button>
    </div>
  );
};

export default ProfileCardMicro;
