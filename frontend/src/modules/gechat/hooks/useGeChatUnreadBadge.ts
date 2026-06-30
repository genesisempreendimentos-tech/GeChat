import { useMemo, useEffect, useRef } from 'react';
import { useGeChatStore } from '@/store/gechatStore';

// Module-level cache so the image is only loaded once
let _faviconImg: HTMLImageElement | null = null;

function loadFaviconImage(): Promise<HTMLImageElement> {
  if (_faviconImg) return Promise.resolve(_faviconImg);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { _faviconImg = img; resolve(img); };
    img.onerror = () => resolve(img);
    img.src = '/assets/GeChat.png';
  });
}

async function applyFaviconBadge(count: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  try {
    const img = await loadFaviconImage();
    if (img.naturalWidth > 0) ctx.drawImage(img, 0, 0, 32, 32);
  } catch { /* ignore */ }

  if (count > 0) {
    const label = count > 9 ? '9+' : String(count);
    const r = 9;
    const cx = 32 - r;
    const cy = r;

    // Red badge circle
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Count text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${label.length > 1 ? 8 : 10}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy + 0.5);
  }

  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (link) link.href = canvas.toDataURL('image/png');
}

function restoreFavicon(originalHref: string) {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (link) link.href = originalHref;
}

export function useGeChatUnreadBadge() {
  const unreadCounters = useGeChatStore((s) => s.unreadCounters);
  const originalHref = useRef<string>('');

  // Number of conversations with at least 1 unread message
  const unreadConvCount = useMemo(
    () => Object.values(unreadCounters).filter((n) => n > 0).length,
    [unreadCounters],
  );

  // Store the original favicon href on mount for cleanup
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    originalHref.current = link?.href ?? '/assets/GeChat.png';
    return () => {
      document.title = 'GêChat';
      restoreFavicon(originalHref.current);
    };
  }, []);

  // Update title and favicon whenever the unread count changes
  useEffect(() => {
    document.title = unreadConvCount > 0 ? `(${unreadConvCount}) GêChat` : 'GêChat';
    void applyFaviconBadge(unreadConvCount);
  }, [unreadConvCount]);
}
