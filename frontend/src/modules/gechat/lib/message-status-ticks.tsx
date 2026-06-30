import { Check, CheckCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageStatus } from '@/modules/gechat/types';

interface MessageStatusTicksProps {
  status?: MessageStatus;
  size?: 'sm' | 'md';
  className?: string;
  /** Cor dos checks quando lidos (estilo WhatsApp). */
  readClassName?: string;
  /** Cor dos checks enviados/entregues. */
  pendingClassName?: string;
}

const sizeClass = {
  sm: 'h-[15px] w-[15px]',
  md: 'h-4 w-4',
} as const;

export function MessageStatusTicks({
  status,
  size = 'sm',
  className,
  readClassName = 'text-sky-500',
  pendingClassName = 'text-muted-foreground/75',
}: MessageStatusTicksProps) {
  const iconClass = cn(sizeClass[size], className);

  if (!status || status === 'failed') return null;

  if (status === 'sending') {
    return <Loader2 className={cn(iconClass, 'animate-spin opacity-70')} aria-hidden />;
  }

  if (status === 'sent') {
    return <Check className={cn(iconClass, pendingClassName)} strokeWidth={2} aria-hidden />;
  }

  if (status === 'delivered') {
    return <CheckCheck className={cn(iconClass, pendingClassName)} strokeWidth={2} aria-hidden />;
  }

  if (status === 'read') {
    return <CheckCheck className={cn(iconClass, readClassName)} strokeWidth={2} aria-hidden />;
  }

  return null;
}
