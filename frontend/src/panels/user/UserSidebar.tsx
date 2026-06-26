import { Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { useSetSidebarWidth } from '@/contexts/SidebarContext';
import { useSidebarLayoutStore } from '@/store/sidebarLayoutStore';
import { SidebarFooterControl } from '@/components/layout/SidebarFooterControl';
import { SidebarNavItem, SidebarSectionTitle } from '@/components/layout/SidebarNavItem';
import { NewConversationDialog } from '@/modules/gechat/components/NewConversationDialog';
import { SidebarConversationNavItem } from '@/modules/gechat/components/SidebarConversationNavItem';
import { useGeChatStore } from '@/store/gechatStore';
import { useNavigate } from 'react-router-dom';

export default function UserSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const layoutMode = useSidebarLayoutStore((s) => s.mode);
  const [isHovered, setIsHovered] = useState(false);
  const isExpanded =
    layoutMode === 'expanded' ? true : layoutMode === 'collapsed' ? false : isHovered;
  const setSidebarWidth = useSetSidebarWidth();
  const conversations = useGeChatStore((s) => s.conversations);

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [conversations],
  );

  const isHome = location.pathname === '/';
  const activeConversationId = location.pathname.startsWith('/c/')
    ? location.pathname.split('/c/')[1]?.split('/')[0]
    : null;

  useEffect(() => {
    setSidebarWidth(isExpanded ? 280 : 80);
  }, [isExpanded, setSidebarWidth]);

  const handleCreated = (id: string) => {
    navigate(`/c/${id}`);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 280 : 80 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      onMouseEnter={() => {
        if (layoutMode !== 'hover') return;
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        if (layoutMode !== 'hover') return;
        setIsHovered(false);
      }}
      className="hidden md:flex fixed left-0 top-16 bottom-0 bg-card/60 dark:bg-card/50 backdrop-blur-xl border-r border-border/70 flex-col z-40 overflow-hidden"
      role="navigation"
      aria-label="Conversas do GêChat"
    >
      <div className="shrink-0 border-b border-border/50 px-2 py-3">
        {isExpanded ? (
          <NewConversationDialog onCreated={handleCreated} className="w-full justify-center gap-1.5" />
        ) : (
          <div className="flex justify-center">
            <NewConversationDialog
              onCreated={handleCreated}
              className="h-10 w-10 justify-center p-0"
              triggerIconOnly
            />
          </div>
        )}
      </div>

      <nav
        className={cn(
          'min-h-0 flex-1 space-y-1 overflow-x-hidden px-0 pt-2 pb-2',
          isExpanded ? 'overflow-y-auto' : 'overflow-hidden',
        )}
      >
        <SidebarNavItem
          to="/"
          icon={Home}
          label="Início"
          isActive={isHome}
          isExpanded={isExpanded}
        />

        {sortedConversations.length > 0 && (
          <SidebarSectionTitle title="Conversas" isExpanded={isExpanded} />
        )}

        {sortedConversations.map((conv) => (
          <SidebarConversationNavItem
            key={conv.id}
            conversation={conv}
            isActive={activeConversationId === conv.id}
            isExpanded={isExpanded}
          />
        ))}
      </nav>

      <div className="relative z-10 shrink-0 border-t border-border/70 bg-card/60 dark:bg-card/50">
        <SidebarFooterControl isExpanded={isExpanded} />
      </div>
    </motion.aside>
  );
}
