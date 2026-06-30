import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useGeChatStore, type InAppNotification } from '@/store/gechatStore';

const DURATION_MS = 5000;

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function NotificationToast({
  n,
  dismiss,
  onNavigate,
}: {
  n: InAppNotification;
  dismiss: (id: string) => void;
  onNavigate: (conversationId: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(n.id), DURATION_MS);
    return () => clearTimeout(timer);
  }, [n.id, dismiss]);

  const handleClick = () => {
    dismiss(n.id);
    onNavigate(n.conversationId);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'w-80 overflow-hidden rounded-2xl cursor-pointer select-none',
        'bg-card/95 backdrop-blur-md border border-border/60 shadow-2xl ring-1 ring-black/5',
        'hover:bg-card transition-colors duration-150',
      )}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div className="flex items-center gap-3 px-3.5 pt-3 pb-2.5">
        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={n.senderAvatar} alt={n.senderName} />
            <AvatarFallback className="text-xs font-semibold bg-primary/15 text-primary">
              {initials(n.senderName)}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1 min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">{n.senderName}</p>
            {n.isGroup && (
              <span className="text-[10px] text-muted-foreground shrink-0 opacity-70">
                · {n.conversationName}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 leading-snug">
            {n.preview}
          </p>
        </div>

        {/* Dismiss button */}
        <button
          type="button"
          aria-label="Fechar notificação"
          onClick={(e) => {
            e.stopPropagation();
            dismiss(n.id);
          }}
          className={cn(
            'shrink-0 flex h-6 w-6 items-center justify-center rounded-full',
            'text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-colors',
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress bar — drains left-to-right over DURATION_MS */}
      <motion.div
        className="h-0.5 bg-primary/70"
        style={{ originX: 0 }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: DURATION_MS / 1000, ease: 'linear' }}
      />
    </div>
  );
}

export function GeChatNotificationToasts() {
  const notifications = useGeChatStore((s) => s.inAppNotifications);
  const dismiss = useGeChatStore((s) => s.dismissInAppNotification);
  const navigate = useNavigate();

  const handleNavigate = useCallback(
    (conversationId: string) => navigate(`/c/${conversationId}`),
    [navigate],
  );

  // Mostra no máximo 4 toasts; mais antigas ficam embaixo, mais novas no topo
  const visible = notifications.slice(-4);

  if (!visible.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence>
        {visible.map((n) => (
          <motion.div
            key={n.id}
            layout
            initial={{ opacity: 0, x: 80, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.92, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="pointer-events-auto"
          >
            <NotificationToast n={n} dismiss={dismiss} onNavigate={handleNavigate} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
