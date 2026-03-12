import React from 'react';
import { Info } from 'lucide-react';

export default function ProfileCardMicro({ 
  name, 
  username, 
  avatarUrl, 
  onInfoClick 
}) {
  return (
    <div 
      className="pc-microcard-container absolute bottom-5 left-5 right-5 z-[10000] flex items-center justify-between bg-[rgba(13,90,80,0.8)] backdrop-blur-[10px] border border-[rgba(2,53,47,0.5)] rounded-[calc(max(0px,30px-20px+6px))] px-3.5 py-3 pointer-events-auto isolate"
      style={{ 
        transform: 'translateZ(0)',
        '--ui-inset': '20px',
        '--ui-radius-bias': '6px',
        '--card-radius': '30px'
      }}
    >
      {/* Container do conteúdo (avatar + texto) */}
      <div 
        className="flex items-center gap-3 flex-1 min-w-0"
        style={{ transform: 'translateZ(0)' }}
      >
        <div className="w-12 h-12 rounded-full overflow-hidden border border-[rgba(255,255,255,0.1)] flex-shrink-0">
          <img
            src={avatarUrl}
            alt={`${name} mini avatar`}
            className="w-full h-full object-cover rounded-full"
            loading="lazy"
            onError={(e) => {
              const t = e.target;
              t.style.opacity = '0.5';
              t.src = avatarUrl;
            }}
          />
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-white/95 leading-tight tracking-wide truncate" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
            {name}
          </div>
          <div className="text-[15px] font-normal text-white/85 leading-tight tracking-wide truncate" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
            @{username}
          </div>
        </div>
      </div>

      {/* Botão de informação no canto direito */}
      <button
        className="w-6 h-6 flex items-center justify-center rounded bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] transition-all duration-200 cursor-pointer hover:bg-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] hover:scale-110 flex-shrink-0 ml-3"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onInfoClick?.();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        type="button"
        aria-label="Informações"
        title="Informações"
        style={{ transform: 'translateZ(0)' }}
      >
        <Info className="w-3.5 h-3.5 text-white" />
      </button>
    </div>
  );
}