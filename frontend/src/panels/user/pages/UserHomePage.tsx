import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useGeChat } from '@/modules/gechat/hooks/useGeChat';
import { DirectConversationsHome } from '@/modules/gechat/components/DirectConversationsHome';
import { ChatWindow } from '@/modules/gechat/components/ChatWindow';
import { ConversationInfoPanel } from '@/modules/gechat/components/ConversationInfoPanel';
import { GroupInfoView } from '@/modules/gechat/components/GroupInfoView';
import { ConnectionBanner } from '@/modules/gechat/components/ConnectionBanner';
import { useGeChatStore } from '@/store/gechatStore';
import { useConversationListStore } from '@/store/conversationListStore';
import { gechatSocket } from '@/lib/realtime/socket-client';
import { gechatApi } from '@/modules/gechat/services/gechat-api';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const DETAILS_INTRO_KEY = 'gechat-details-intro-shown';
const INFO_PANEL_WIDTH = 288;

export default function UserHomePage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const conversations = useGeChatStore((s) => s.conversations);
  const {
    openConversation,
    loadConversations,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    loadMoreMessages,
  } = useGeChat();
  const setActiveConversation = useGeChatStore((s) => s.setActiveConversation);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [infoOpen, setInfoOpen] = useState(false);
  const introHandled = useRef(false);
  const reloadAttempted = useRef<string | null>(null);

  const activeConversation = useMemo(
    () => (conversationId ? conversations.find((c) => c.id === conversationId) ?? null : null),
    [conversations, conversationId],
  );

  useEffect(() => {
    if (!conversationId) {
      setActiveConversation(null);
      return;
    }
    void openConversation(conversationId);
  }, [conversationId, openConversation, setActiveConversation]);

  useEffect(() => {
    if (!conversationId || activeConversation) {
      reloadAttempted.current = null;
      return;
    }
    if (reloadAttempted.current === conversationId) return;
    reloadAttempted.current = conversationId;
    void loadConversations();
  }, [conversationId, activeConversation, loadConversations]);

  useEffect(() => {
    setInfoOpen(false);
  }, [conversationId]);

  // Quando o usuário volta à aba (após ter ficado em background), marca a
  // conversa ativa como lida — respeitando a setting "leitura em segundo plano".
  useEffect(() => {
    if (!conversationId) return;
    const onVisible = () => {
      if (document.hidden) return;
      const { readInBackground } = useConversationListStore.getState();
      if (!readInBackground) {
        gechatSocket.markRead(conversationId);
        gechatApi.markAsRead(conversationId).catch(console.error);
        useGeChatStore.getState().clearUnread(conversationId);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !isDesktop || introHandled.current) return;
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv?.type === 'group') return;
    introHandled.current = true;

    try {
      if (!localStorage.getItem(DETAILS_INTRO_KEY)) {
        setInfoOpen(true);
        localStorage.setItem(DETAILS_INTRO_KEY, '1');
      }
    } catch {
      /* ignore storage errors */
    }
  }, [conversationId, isDesktop, conversations]);

  const handleCreated = (id: string) => {
    navigate(`/c/${id}`);
  };

  if (!conversationId) {
    return (
      <div className="flex h-full flex-col">
        <ConnectionBanner />
        <DirectConversationsHome
          conversations={conversations}
          onCreated={handleCreated}
          onOpen={(id) => void openConversation(id)}
        />
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

  const isGroup = activeConversation.type === 'group';
  const showGroupInfo = isGroup && infoOpen;
  const showSideInfo = !isGroup && infoOpen && isDesktop;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ConnectionBanner />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {showGroupInfo ? (
          <GroupInfoView
            key={activeConversation.id}
            conversation={activeConversation}
            onClose={() => setInfoOpen(false)}
          />
        ) : (
          <>
            <ChatWindow
              key={activeConversation.id}
              conversation={activeConversation}
              onSend={sendMessage}
              onEditMessage={editMessage}
              onDeleteMessage={deleteMessage}
              onToggleReaction={toggleReaction}
              onLoadMore={loadMoreMessages ? () => loadMoreMessages(activeConversation.id) : undefined}
              onBack={() => navigate('/')}
              infoOpen={showSideInfo}
              onToggleInfo={() => setInfoOpen((v) => !v)}
            />
            <AnimatePresence initial={false}>
              {showSideInfo && (
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
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
