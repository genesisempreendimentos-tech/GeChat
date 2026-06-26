import { useCallback, useEffect, useRef } from 'react';
import { gechatSocket } from '@/lib/realtime/socket-client';

const TYPING_STOP_MS = 2500;

export function useTypingDebounce(conversationId: string | null) {
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);
  const prevConversationId = useRef<string | null>(null);

  useEffect(() => {
    if (prevConversationId.current && prevConversationId.current !== conversationId) {
      gechatSocket.emitTypingStop(prevConversationId.current);
      isTyping.current = false;
    }
    prevConversationId.current = conversationId;
  }, [conversationId]);

  const onType = useCallback(() => {
    if (!conversationId) return;
    if (!isTyping.current) {
      isTyping.current = true;
      gechatSocket.emitTypingStart(conversationId);
    }
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(() => {
      isTyping.current = false;
      gechatSocket.emitTypingStop(conversationId);
    }, TYPING_STOP_MS);
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    if (!conversationId) return;
    if (stopTimer.current) clearTimeout(stopTimer.current);
    if (isTyping.current) {
      isTyping.current = false;
      gechatSocket.emitTypingStop(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    return () => {
      if (stopTimer.current) clearTimeout(stopTimer.current);
      if (conversationId && isTyping.current) {
        gechatSocket.emitTypingStop(conversationId);
      }
    };
  }, [conversationId]);

  return { onType, stopTyping };
}
