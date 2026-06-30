import { useSettingsStore } from '@/store/settingsStore';
import { playNotificationSoundById } from '@/modules/gechat/lib/notification-sounds';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function canShowBrowserNotifications(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

export async function playDefaultNotificationTone(): Promise<void> {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => void ctx.close();
  } catch {
    // ignore — AudioContext may be suspended or unavailable
  }
}

export function playNotificationSound(): void {
  const soundId = useSettingsStore.getState().notificationSoundId ?? 'default';
  playNotificationSoundById(soundId, () => {
    void playDefaultNotificationTone();
  });
}

// Cached SW registration promise — created once, reused forever.
let _swRegPromise: Promise<ServiceWorkerRegistration | null> | null = null;

function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  if (!_swRegPromise) {
    _swRegPromise = navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Activate immediately without waiting for existing tabs to close
        if (reg.installing) reg.installing.postMessage({ type: 'skip-waiting' });
        return reg;
      })
      .catch((err) => {
        console.warn('[GêChat] Service worker registration failed:', err);
        return null;
      });
  }
  return _swRegPromise;
}

/** Pre-registers the service worker early so it's ready when needed. */
export function initNotificationServiceWorker(): void {
  void getSwRegistration();
}

export async function showBrowserNotification({
  title,
  body,
  icon,
  conversationId,
}: {
  title: string;
  body: string;
  icon?: string;
  conversationId: string;
}): Promise<void> {
  if (!canShowBrowserNotifications()) return;

  // `renotify: true` faz o OS exibir popup + som mesmo quando a tag já existe
  // (sem isso, notificações seguintes da mesma conversa substituem a anterior
  // silenciosamente). Não está no lib.dom do TS 5.9 — cast necessário.
  const options = {
    body,
    icon: icon ?? '/assets/GeChat.png',
    badge: '/assets/GeChat.png',
    tag: `gechat-${conversationId}`,
    renotify: true,
    data: { conversationId },
    silent: false,
  } as NotificationOptions;

  try {
    const reg = await getSwRegistration();
    if (reg) {
      // ServiceWorker path — the only way to get OS-level popups in Chrome
      await reg.showNotification(title, options);
    } else {
      // Fallback: page-level notification (works on Firefox without SW)
      const notif = new Notification(title, options);
      notif.onerror = (e) => console.error('[GêChat] Notification error:', e);
      notif.onclick = () => {
        window.focus();
        sessionStorage.setItem('gechat:pendingNav', `/c/${conversationId}`);
        window.dispatchEvent(new CustomEvent('gechat:navigate'));
        notif.close();
      };
    }
  } catch (err) {
    console.error('[GêChat] showBrowserNotification failed:', err);
  }
}
