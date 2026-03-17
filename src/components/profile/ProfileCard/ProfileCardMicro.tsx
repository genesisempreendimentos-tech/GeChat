// ProfileCardMicro.tsx
import React from 'react'
import { Info } from 'lucide-react'

interface ProfileCardMicroProps {
  /** Apelido ou nome de exibição (apelido + username conforme plano) */
  displayName: string;
  username: string;
  avatarUrl: string;
  /** Ícone opcional ao lado do username (URL ou null) */
  iconUrl?: string | null;
  onInfoClick?: () => void;
}

export default function ProfileCardMicro({ displayName, username, avatarUrl, iconUrl, onInfoClick }: ProfileCardMicroProps) {
  return (
    <div
      className="pc-microcard-container absolute bottom-4 left-4 right-4 z-[10000]
                 flex items-center gap-2
                 bg-[rgba(8,60,52,0.75)] backdrop-blur-[12px]
                 border border-[rgba(26,147,134,0.25)]
                 rounded-2xl px-3 py-2 pointer-events-auto isolate"
      style={{ transform: 'translateZ(0)', minWidth: 0, overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 0%', minWidth: 0, overflow: 'hidden', transform: 'translateZ(0)' }}>
        <img
          src={avatarUrl}
          alt={`${displayName} mini avatar`}
          className="rounded-full object-cover ring-1 ring-white/15"
          style={{ width: 32, height: 32, flexShrink: 0 }}
          loading="lazy"
        />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', lineHeight: 1.2 }}>
          <span
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.95)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}
          >
            {displayName}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, minWidth: 0, overflow: 'hidden' }}>
            {iconUrl && (
              <span
                className="shrink-0 flex items-center justify-center rounded-md overflow-hidden ring-1 ring-white/20 bg-white/5"
                style={{ width: 14, height: 14 }}
              >
                <img src={iconUrl} alt="" className="w-full h-full object-contain" />
              </span>
            )}
            <span
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 400,
                color: 'rgba(94,234,212,0.8)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              @{username}
            </span>
          </div>
        </div>
      </div>

      {/* Botão info */}
      <button
        className="flex items-center justify-center rounded-full flex-shrink-0
                   bg-white/10 border border-white/15
                   transition-all duration-200 cursor-pointer
                   hover:bg-teal-500/30 hover:border-teal-400/40 hover:scale-110
                   active:scale-95"
        style={{ width: 28, height: 28, flexShrink: 0, transform: 'translateZ(0)' }}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onInfoClick?.() }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        type="button"
        aria-label="Informações"
      >
        <Info className="w-3.5 h-3.5 text-white/80" />
      </button>
    </div>
  )
}