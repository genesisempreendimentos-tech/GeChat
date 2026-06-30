import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PanelShell } from '@/components/layout/PanelShell';
import UserSidebar from '@/panels/user/UserSidebar';
import { useGeChatSocket } from '@/modules/gechat/hooks/useGeChatSocket';
import { useGeChatBootstrap } from '@/modules/gechat/hooks/useGeChat';
import { GeChatNotificationToasts } from '@/modules/gechat/components/GeChatNotificationToasts';
import {
  initNotificationServiceWorker,
  requestNotificationPermission,
} from '@/modules/gechat/services/gechat-notifications';
import { useGeChatUnreadBadge } from '@/modules/gechat/hooks/useGeChatUnreadBadge';

export default function UserLayout() {
  useGeChatSocket(true);
  useGeChatBootstrap();
  useGeChatUnreadBadge();

  const navigate = useNavigate();

  useEffect(() => {
    // Registra o service worker cedo para que esteja pronto quando chegar uma notificação
    initNotificationServiceWorker();

    // Solicita permissão via gesto do usuário (toast com botão).
    // Browsers modernos ignoram chamadas sem gesto — o clique no toast resolve isso.
    if ('Notification' in window && Notification.permission === 'default') {
      if (!sessionStorage.getItem('gechat:notif-prompted')) {
        sessionStorage.setItem('gechat:notif-prompted', '1');
        toast('Ative as notificações para ser avisado de novas mensagens.', {
          duration: 12000,
          action: {
            label: 'Ativar',
            onClick: () => void requestNotificationPermission(),
          },
        });
      }
    }
  }, []);

  // Escuta mensagens do service worker (clique em notificação nativa → navega)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'gechat:navigate' && typeof event.data.path === 'string') {
        navigate(event.data.path as string);
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [navigate]);

  // Quando o usuário clica em uma notificação nativa do browser,
  // navega para a conversa correspondente ao focar a janela
  useEffect(() => {
    const handle = () => {
      const path = sessionStorage.getItem('gechat:pendingNav');
      if (path) {
        sessionStorage.removeItem('gechat:pendingNav');
        navigate(path);
      }
    };
    window.addEventListener('gechat:navigate', handle);
    window.addEventListener('focus', handle);
    return () => {
      window.removeEventListener('gechat:navigate', handle);
      window.removeEventListener('focus', handle);
    };
  }, [navigate]);

  return (
    <>
      <PanelShell sidebar={UserSidebar} mainAriaLabel="GêChat" mainClassName="gechat-main" />
      <GeChatNotificationToasts />
    </>
  );
}
