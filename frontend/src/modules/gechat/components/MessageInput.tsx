import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Baseline,
  Bold,
  Code,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListTodo,
  Loader2,
  Mic,
  Plus,
  Quote,
  Send,
  Smile,
  Sticker,
  Strikethrough,
  Underline,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTypingDebounce } from '@/modules/gechat/hooks/useTypingDebounce';
import {
  buildFileContent,
  buildImageContent,
  buildLinkContent,
  buildStickerContent,
  buildTextContent,
} from '@/modules/gechat/lib/message-content';
import { applyTextFormat, type TextFormat } from '@/modules/gechat/lib/text-format';
import { storageService } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { useGeChatStore } from '@/store/gechatStore';
import type { MessageType } from '@/modules/gechat/types';

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '🥰', '😘', '😎', '🤔',
  '😅', '😢', '😭', '😡', '🙏', '👍', '👏', '🙌', '🔥', '❤️',
  '💙', '💚', '💛', '💜', '🎉', '✨', '⭐', '✅', '❌', '💬',
];

const STICKERS = ['👍', '❤️', '😂', '🔥', '🎉', '🙏', '😍', '🤝', '💪', '🥳', '😎', '🤩'];

const SLIDE_TRANSITION = { duration: 0.28, ease: [0.32, 0.72, 0, 1] as const };

type ComposerPlusAction = {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  comingSoonMessage: string;
};

const COMPOSER_PLUS_ACTIONS: ComposerPlusAction[] = [
  {
    id: 'getask',
    title: 'GêTask',
    description: 'Enviar demanda pelo chat para aceite no GêTask',
    icon: <ListTodo className="h-4 w-4" />,
    comingSoonMessage:
      'Em breve você poderá enviar demandas pelo chat para aceite direto no GêTask.',
  },
];

type ComposerFlyoutKind = 'emoji' | 'sticker' | 'upload';

type ComposerFlyoutPlacement = 'above-end' | 'above-start';

function ComposerFlyout({
  open,
  anchorRef,
  panelId,
  onClose,
  children,
  className,
  placement = 'above-end',
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  panelId: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  placement?: ComposerFlyoutPlacement;
}) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (placement === 'above-start') {
      setPosition({ top: rect.top - 8, left: rect.left });
    } else {
      setPosition({ top: rect.top - 8, left: rect.right });
    }
  }, [anchorRef, placement]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (document.getElementById(panelId)?.contains(target)) return;
      onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, onClose, anchorRef, panelId]);

  if (!open) return null;

  return createPortal(
    <div
      id={panelId}
      role="dialog"
      aria-modal="false"
      className={cn(
        'fixed z-[200] max-h-[min(320px,50vh)] -translate-y-full overflow-auto',
        placement === 'above-end' && '-translate-x-full',
        'rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-lg',
        className,
      )}
      style={{ top: position.top, left: position.left }}
    >
      {children}
    </div>,
    document.body,
  );
}

const SideActionButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    active?: boolean;
    label: string;
    children: ReactNode;
  }
>(function SideActionButton({ active, label, children, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors',
        'text-foreground hover:bg-muted/80',
        'disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-primary/15 text-primary ring-1 ring-inset ring-primary/30',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

function FormatToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-sm transition-colors',
        'text-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {children}
    </button>
  );
}

function FormatToolbar({
  onFormat,
  onLink,
}: {
  onFormat: (format: TextFormat) => void;
  onLink: () => void;
}) {
  const textItems: Array<{ format: TextFormat; label: string; icon: ReactNode }> = [
    { format: 'bold', label: 'Negrito', icon: <Bold className="h-4 w-4" /> },
    { format: 'italic', label: 'Itálico', icon: <Italic className="h-4 w-4" /> },
    { format: 'underline', label: 'Sublinhado', icon: <Underline className="h-4 w-4" /> },
    { format: 'strike', label: 'Tachado', icon: <Strikethrough className="h-4 w-4" /> },
    { format: 'list', label: 'Lista', icon: <List className="h-4 w-4" /> },
    { format: 'quote', label: 'Citação', icon: <Quote className="h-4 w-4" /> },
  ];
  return (
    <div className="flex flex-wrap items-center gap-0 border-b border-border/50 bg-muted/40 px-1.5 py-1">
      {textItems.map((item, index) => (
        <div key={item.format} className="flex items-center">
          <FormatToolbarButton label={item.label} onClick={() => onFormat(item.format)}>
            {item.icon}
          </FormatToolbarButton>
          {(index === 3 || index === 4) && (
            <Separator orientation="vertical" className="mx-0.5 h-5 bg-border" />
          )}
        </div>
      ))}
      <Separator orientation="vertical" className="mx-0.5 h-5 bg-border" />
      <FormatToolbarButton label="Link" onClick={onLink}>
        <Link2 className="h-4 w-4" />
      </FormatToolbarButton>
      <Separator orientation="vertical" className="mx-0.5 h-5 bg-border" />
      <FormatToolbarButton label="Bloco de código" onClick={() => onFormat('codeBlock')}>
        <Code className="h-4 w-4" />
      </FormatToolbarButton>
    </div>
  );
}

interface MessageInputProps {
  conversationId: string | null;
  onSend: (content: string, type?: MessageType) => void;
  disabled?: boolean;
}

export function MessageInput({ conversationId, onSend, disabled }: MessageInputProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const replyTo = useGeChatStore((s) => s.replyTo);
  const setReplyTo = useGeChatStore((s) => s.setReplyTo);
  const [value, setValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [activeFlyout, setActiveFlyout] = useState<ComposerFlyoutKind | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const stickerBtnRef = useRef<HTMLButtonElement>(null);
  const uploadBtnRef = useRef<HTMLButtonElement>(null);
  const plusBtnRef = useRef<HTMLButtonElement>(null);
  const { onType, stopTyping } = useTypingDebounce(conversationId);

  const closeFlyout = () => setActiveFlyout(null);
  const closePlusMenu = () => setPlusMenuOpen(false);

  const toggleFlyout = (kind: ComposerFlyoutKind) => {
    setPlusMenuOpen(false);
    setActiveFlyout((current) => (current === kind ? null : kind));
  };

  const togglePlusMenu = () => {
    closeFlyout();
    setPlusMenuOpen((open) => !open);
  };

  const handlePlusAction = (action: ComposerPlusAction) => {
    closePlusMenu();
    toast.info(action.comingSoonMessage);
  };

  const canSend = Boolean(conversationId) && !disabled && !uploading;

  const focusTextarea = (start: number, end: number) => {
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, end);
    });
  };

  const handleSendText = () => {
    const trimmed = buildTextContent(value);
    if (!trimmed || !canSend) return;
    stopTyping();
    onSend(trimmed, 'text');
    setValue('');
    setFormatOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleFormat = (format: TextFormat) => {
    const el = textareaRef.current;
    if (!el || !canSend) return;
    const result = applyTextFormat(value, el.selectionStart, el.selectionEnd, format);
    setValue(result.text);
    onType();
    focusTextarea(result.selectionStart, result.selectionEnd);
  };

  const handleImageUpload = async (file: File) => {
    if (!conversationId || !userId) return;
    setUploading(true);
    try {
      const { url, error } = await storageService.uploadChatImage(file, conversationId, userId);
      if (!url || error) throw error ?? new Error('Falha no upload.');
      stopTyping();
      onSend(buildImageContent(url, file.name), 'image');
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível enviar a imagem. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!conversationId || !userId) return;
    setUploading(true);
    try {
      const { url, error } = await storageService.uploadChatFile(file, conversationId, userId);
      if (!url || error) throw error ?? new Error('Falha no upload.');
      stopTyping();
      onSend(
        buildFileContent({
          url,
          name: file.name,
          size: file.size,
          mime: file.type || undefined,
        }),
        'file',
      );
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível enviar o arquivo. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleSendLink = () => {
    const url = linkUrl.trim();
    if (!url || !canSend) return;
    stopTyping();
    onSend(buildLinkContent(url, linkTitle), 'text');
    setLinkUrl('');
    setLinkTitle('');
    setLinkOpen(false);
  };

  const handleSticker = (emoji: string) => {
    if (!conversationId || disabled || uploading) return;
    stopTyping();
    onSend(buildStickerContent(emoji), 'image');
    closeFlyout();
  };

  const insertEmoji = (emoji: string) => {
    if (!conversationId || disabled || uploading) return;
    setValue((prev) => `${prev}${emoji}`);
    onType();
    closeFlyout();
    textareaRef.current?.focus();
  };

  const openImagePicker = () => {
    closeFlyout();
    imageInputRef.current?.click();
  };

  const openFilePicker = () => {
    closeFlyout();
    fileInputRef.current?.click();
  };

  const handleVoiceClick = () => {
    if (!conversationId || disabled || uploading) return;
    toast.info('Funcionalidade em breve implementada.');
  };

  return (
    <>
      <div className="shrink-0 border-t border-border/60 bg-card/40 px-3 py-2 md:px-4">
        <div className="flex w-full items-end gap-1.5">
          <input
            ref={imageInputRef}
            id="gechat-composer-image"
            type="file"
            accept="image/*"
            disabled={!canSend}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImageUpload(file);
              e.target.value = '';
            }}
          />
          <input
            ref={fileInputRef}
            id="gechat-composer-file"
            type="file"
            disabled={!canSend}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileUpload(file);
              e.target.value = '';
            }}
          />

          <button
            ref={plusBtnRef}
            type="button"
            disabled={!canSend}
            aria-label="Mais opções"
            aria-expanded={plusMenuOpen}
            onClick={togglePlusMenu}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              'bg-primary/10 text-primary transition-colors hover:bg-primary/15',
              'disabled:pointer-events-none disabled:opacity-40',
              plusMenuOpen && 'bg-primary/20 ring-1 ring-inset ring-primary/30',
            )}
          >
            <Plus className="h-5 w-5" />
          </button>
          <ComposerFlyout
            open={plusMenuOpen}
            anchorRef={plusBtnRef}
            panelId="gechat-plus-menu"
            onClose={closePlusMenu}
            placement="above-start"
            className="w-72 p-0"
          >
            <div className="border-b border-border/60 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Futuras funcionalidades
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Integrações que chegarão ao composer do chat
              </p>
            </div>
            <div className="p-1">
              {COMPOSER_PLUS_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handlePlusAction(action)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {action.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{action.title}</span>
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        Em breve
                      </Badge>
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      {action.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </ComposerFlyout>

          <div
            data-composer-root
            className={cn(
              'flex min-w-0 flex-1 flex-col overflow-hidden border border-border/50 bg-muted/40',
              formatOpen && 'ring-1 ring-inset ring-primary/25',
            )}
          >
            {replyTo && (
              <div className="flex items-start gap-2 border-b border-border/50 px-3 py-2">
                <div className="min-w-0 flex-1 border-l-2 border-primary pl-2">
                  <p className="text-xs font-medium text-primary">{replyTo.senderName}</p>
                  <p className="truncate text-xs text-muted-foreground">{replyTo.preview}</p>
                </div>
                <button
                  type="button"
                  aria-label="Cancelar citação"
                  onClick={() => setReplyTo(null)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <AnimatePresence initial={false}>
              {formatOpen && (
                <motion.div
                  key="format-toolbar"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={SLIDE_TRANSITION}
                  className="overflow-hidden"
                >
                  <FormatToolbar onFormat={handleFormat} onLink={() => setLinkOpen(true)} />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex min-w-0 items-end gap-0.5 px-1.5 py-1">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  onType();
                }}
                onKeyDown={handleKeyDown}
                disabled={!canSend}
                placeholder={conversationId ? 'Digite uma mensagem...' : 'Selecione uma conversa'}
                rows={1}
                className={cn(
                  'min-w-0 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-sm leading-relaxed',
                  'max-h-32 min-h-[36px]',
                  'placeholder:text-muted-foreground focus-visible:outline-none',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
              />

              <div className="flex shrink-0 items-center gap-0 pb-0.5">
                {uploading && (
                  <Loader2 className="mx-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                )}
                <SideActionButton
                  label="Formatação de texto"
                  active={formatOpen}
                  disabled={!canSend}
                  onClick={() => {
                    setFormatOpen((open) => !open);
                    textareaRef.current?.focus();
                  }}
                  aria-pressed={formatOpen}
                >
                  <Baseline className="h-4 w-4" />
                </SideActionButton>

                <SideActionButton
                  ref={emojiBtnRef}
                  label="Emoji"
                  disabled={!canSend}
                  active={activeFlyout === 'emoji'}
                  aria-expanded={activeFlyout === 'emoji'}
                  onClick={() => toggleFlyout('emoji')}
                >
                  <Smile className="h-4 w-4" />
                </SideActionButton>
                <ComposerFlyout
                  open={activeFlyout === 'emoji'}
                  anchorRef={emojiBtnRef}
                  panelId="gechat-emoji-flyout"
                  onClose={closeFlyout}
                  className="w-56"
                >
                  <div className="grid grid-cols-8 gap-0.5">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-muted"
                        onClick={() => insertEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </ComposerFlyout>

                <SideActionButton
                  ref={stickerBtnRef}
                  label="Figurinha"
                  disabled={!canSend}
                  active={activeFlyout === 'sticker'}
                  aria-expanded={activeFlyout === 'sticker'}
                  onClick={() => toggleFlyout('sticker')}
                >
                  <Sticker className="h-4 w-4" />
                </SideActionButton>
                <ComposerFlyout
                  open={activeFlyout === 'sticker'}
                  anchorRef={stickerBtnRef}
                  panelId="gechat-sticker-flyout"
                  onClose={closeFlyout}
                  className="w-52"
                >
                  <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Figurinhas
                  </p>
                  <div className="grid grid-cols-4 gap-1">
                    {STICKERS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 text-3xl transition-transform hover:scale-105 hover:bg-muted"
                        onClick={() => handleSticker(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </ComposerFlyout>

                <SideActionButton
                  ref={uploadBtnRef}
                  label="Enviar arquivo"
                  disabled={!canSend}
                  active={activeFlyout === 'upload'}
                  aria-expanded={activeFlyout === 'upload'}
                  onClick={() => toggleFlyout('upload')}
                >
                  <Upload className="h-4 w-4" />
                </SideActionButton>
                <ComposerFlyout
                  open={activeFlyout === 'upload'}
                  anchorRef={uploadBtnRef}
                  panelId="gechat-upload-flyout"
                  onClose={closeFlyout}
                  className="w-44 p-1"
                >
                  <button
                    type="button"
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={openImagePicker}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Imagem
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={openFilePicker}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Documento
                  </button>
                </ComposerFlyout>

                <SideActionButton
                  label="Mensagem de voz"
                  disabled={!canSend}
                  onClick={handleVoiceClick}
                >
                  <Mic className="h-4 w-4" />
                </SideActionButton>

                <SideActionButton
                  label="Enviar mensagem"
                  disabled={!canSend || !value.trim()}
                  onClick={handleSendText}
                  className="bg-primary/10 text-primary hover:bg-primary/20"
                >
                  <Send className="h-4 w-4" />
                </SideActionButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="https://exemplo.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
            <Input
              placeholder="Título (opcional)"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLinkOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSendLink} disabled={!linkUrl.trim()}>
              Enviar link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
