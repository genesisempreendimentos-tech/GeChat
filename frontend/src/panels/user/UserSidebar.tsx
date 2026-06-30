import { motion } from 'framer-motion';
import { GLASS_SHELL_BORDER_R } from '@/lib/shellStyles';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSetSidebarWidth } from '@/contexts/SidebarContext';
import { useSidebarLayoutStore } from '@/store/sidebarLayoutStore';
import { SidebarFooterControl } from '@/components/layout/SidebarFooterControl';
import { ConversationListPanel } from '@/modules/gechat/components/ConversationListPanel';

const SIDEBAR_WIDTH_EXPANDED = 360;
const SIDEBAR_WIDTH_COLLAPSED = 72;

export default function UserSidebar() {
  const layoutMode = useSidebarLayoutStore((s) => s.mode);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverLockCount, setHoverLockCount] = useState(0);
  const isHoverLocked = hoverLockCount > 0;
  const isExpanded =
    layoutMode === 'expanded'
      ? true
      : layoutMode === 'collapsed'
        ? false
        : isHovered || isHoverLocked;
  const setSidebarWidth = useSetSidebarWidth();

  const hoverLockRef = useRef(0);
  const handleHoverLockChange = useCallback((locked: boolean) => {
    hoverLockRef.current = Math.max(0, hoverLockRef.current + (locked ? 1 : -1));
    setHoverLockCount(hoverLockRef.current);
  }, []);

  useEffect(() => {
    setSidebarWidth(isExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED);
  }, [isExpanded, setSidebarWidth]);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      onMouseEnter={() => {
        if (layoutMode !== 'hover') return;
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        if (layoutMode !== 'hover' || isHoverLocked) return;
        setIsHovered(false);
      }}
      className={cn(
        'hidden md:flex fixed left-0 top-16 bottom-0 flex-col z-40 overflow-hidden',
        GLASS_SHELL_BORDER_R,
      )}
      role="navigation"
      aria-label="Conversas do GêChat"
    >
      <div className="min-h-0 flex-1 overflow-hidden">
        <ConversationListPanel
          isExpanded={isExpanded}
          onSidebarHoverLockChange={handleHoverLockChange}
        />
      </div>

      <div className={cn('relative z-10 shrink-0 border-t border-border/70 bg-card/55')}>
        <SidebarFooterControl isExpanded={isExpanded} />
      </div>
    </motion.aside>
  );
}
