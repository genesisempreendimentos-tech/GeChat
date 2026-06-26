import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, UserPlus, Users, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { gechatApi } from '@/modules/gechat/services/gechat-api';
import { storageService } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  finalizeConversationCreate,
  SelectedMemberChips,
  useConversationUsers,
} from './shared';
import { SelectGroupMembersDialog } from './SelectGroupMembersDialog';

const MAX_DESCRIPTION = 500;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface CreateGroupConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (conversationId: string) => void;
}

export function CreateGroupConversationDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateGroupConversationDialogProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [membersOpen, setMembersOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const picker = useConversationUsers(open);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const reset = () => {
    setName('');
    setDescription('');
    setImageFile(null);
    setImagePreview(null);
    setSelectedUsers([]);
    setMembersOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleImagePick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('A imagem deve ter no máximo 5 MB.');
      return;
    }
    setImageFile(file);
  };

  const canCreate = name.trim().length > 0 && selectedUsers.length > 0;

  const handleCreate = async () => {
    if (!canCreate || !userId) return;
    setLoading(true);
    try {
      let avatarUrl: string | undefined;
      if (imageFile) {
        const { url, error } = await storageService.uploadGroupAvatar(userId, imageFile);
        if (error || !url) {
          const detail =
            typeof error === 'object' && error && 'message' in error
              ? String((error as { message?: string }).message)
              : null;
          toast.error(detail || 'Não foi possível enviar a imagem do grupo.');
          setLoading(false);
          return;
        }
        avatarUrl = url;
      }

      const conv = await gechatApi.createGroup(name.trim(), selectedUsers, {
        description: description.trim() || undefined,
        avatarUrl,
      });
      await finalizeConversationCreate(conv, onCreated);
      reset();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível criar o grupo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg gap-0 p-0 overflow-hidden" dismissOnOutsideClick={false}>
          <DialogHeader className="space-y-3 border-b border-border/60 px-6 py-5 text-left">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400">
                <Users className="h-5 w-5" />
              </span>
              <div className="min-w-0 pt-0.5">
                <DialogTitle>Novo grupo</DialogTitle>
                <DialogDescription className="mt-1">
                  Personalize o grupo e convide os participantes.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[min(58vh,520px)] space-y-5 overflow-y-auto px-6 py-5">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border/70 bg-muted/30 transition-colors',
                  'hover:border-sky-500/40 hover:bg-muted/50',
                )}
                aria-label="Escolher imagem do grupo"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Users className="h-8 w-8 text-muted-foreground/60" />
                )}
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-background/80 py-1 text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-3 w-3" />
                  Foto
                </span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => handleImagePick(e.target.files?.[0])}
              />

              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium">Imagem do grupo</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Opcional. JPG ou PNG, até 5 MB.
                </p>
                {imagePreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => {
                      setImageFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Remover imagem
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="group-name" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Nome do grupo
              </label>
              <Input
                id="group-name"
                placeholder="Ex.: Equipe Comercial"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 border-border/60 bg-muted/30"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="group-description" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Descrição
              </label>
              <textarea
                id="group-description"
                placeholder="Sobre o que é este grupo? (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
                rows={3}
                className={cn(
                  'flex w-full resize-none rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm shadow-sm',
                  'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                )}
              />
              <p className="text-right text-[11px] text-muted-foreground">
                {description.length}/{MAX_DESCRIPTION}
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/15 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Participantes</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedUsers.length > 0
                      ? `${selectedUsers.length} pessoa${selectedUsers.length !== 1 ? 's' : ''} selecionada${selectedUsers.length !== 1 ? 's' : ''}`
                      : 'Nenhum participante adicionado ainda'}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => setMembersOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>

              {selectedUsers.length > 0 ? (
                <SelectedMemberChips
                  users={picker.users}
                  selectedIds={selectedUsers}
                  onRemove={(id) => setSelectedUsers((prev) => prev.filter((uid) => uid !== id))}
                />
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 bg-background/50 px-3 py-3 text-xs text-muted-foreground">
                  <Avatar className="h-8 w-8 opacity-50">
                    <AvatarFallback className="text-[10px]">+</AvatarFallback>
                  </Avatar>
                  Toque em Adicionar para escolher quem entra no grupo.
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-border/60 bg-muted/20 px-6 py-4 sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreate} disabled={loading || !canCreate}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar grupo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SelectGroupMembersDialog
        open={membersOpen}
        onOpenChange={setMembersOpen}
        selectedIds={selectedUsers}
        onConfirm={setSelectedUsers}
      />
    </>
  );
}
