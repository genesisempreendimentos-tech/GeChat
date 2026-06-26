import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useGeChat } from '@/modules/gechat/hooks/useGeChat';
import { DirectConversationsHome } from '@/modules/gechat/components/DirectConversationsHome';
import { ChatWindow } from '@/modules/gechat/components/ChatWindow';
import { ConversationInfoPanel } from '@/modules/gechat/components/ConversationInfoPanel';
import { ConnectionBanner } from '@/modules/gechat/components/ConnectionBanner';
import { useGeChatStore } from '@/store/gechatStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const DETAILS_INTRO_KEY = 'gechat-details-intro-shown';
const INFO_PANEL_WIDTH = 288;

export default function UserHomePage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { conversations, openConversation, sendMessage, editMessage, deleteMessage, toggleReaction } =
    useGeChat();
  const setActiveConversation = useGeChatStore((s) => s.setActiveConversation);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [infoOpen, setInfoOpen] = useState(false);
  const introHandled = useRef(false);

  const activeConversation = useMemo(
    () => (conversationId ? conversations.find((c) => c.id === conversationId) ?? null : null),
    [conversations, conversationId],
  );

  useEffect(() => {
    if (conversationId) {
      void openConversation(conversationId);
    } else {
      setActiveConversation(null);
    }
  }, [conversationId, openConversation, setActiveConversation]);

  useEffect(() => {
    if (!conversationId || !isDesktop || introHandled.current) return;
    introHandled.current = true;

    try {
      if (!localStorage.getItem(DETAILS_INTRO_KEY)) {
        setInfoOpen(true);
        localStorage.setItem(DETAILS_INTRO_KEY, '1');
      }
    } catch {
      /* ignore storage errors */
    }
  }, [conversationId, isDesktop]);

  const handleCreated = (id: string) => {
    navigate(`/c/${id}`);
  };

  if (!conversationId) {
    return (
      <div className="flex h-full flex-col">
        <ConnectionBanner />
        <DirectConversationsHome conversations={conversations} onCreated={handleCreated} />
      </div>
    );
  }

  if (!activeConversation) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
        Carregando conversa...
      </div>
    );
  }

  const showInfo = infoOpen && isDesktop;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ConnectionBanner />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ChatWindow
          conversation={activeConversation}
          onSend={sendMessage}
          onEditMessage={editMessage}
          onDeleteMessage={deleteMessage}
          onToggleReaction={toggleReaction}
          onBack={() => navigate('/')}
          infoOpen={showInfo}
          onToggleInfo={() => setInfoOpen((v) => !v)}
        />
        <AnimatePresence initial={false}>
          {showInfo && (
            <motion.div
              key="conversation-info-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: INFO_PANEL_WIDTH, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="h-full shrink-0 overflow-hidden"
            >
              <ConversationInfoPanel
                conversation={activeConversation}
                onClose={() => setInfoOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>      </div>
    </div>
  );
}
