import { useEffect, useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConversationUserPicker, useConversationUsers } from './shared';

interface SelectGroupMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
  excludeIds?: string[];
  title?: string;
  description?: string;
  confirmLabel?: string;
}

export function SelectGroupMembersDialog({
  open,
  onOpenChange,
  selectedIds,
  onConfirm,
  excludeIds = [],
  title = 'Adicionar participantes',
  description = 'Selecione os colegas que farão parte do grupo.',
  confirmLabel = 'Confirmar',
}: SelectGroupMembersDialogProps) {
  const picker = useConversationUsers(open);
  const [draftIds, setDraftIds] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (open) setDraftIds(selectedIds);
  }, [open, selectedIds]);

  const toggleUser = (id: string) => {
    setDraftIds((prev) => (prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]));
  };

  const handleConfirm = () => {
    onConfirm(draftIds);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0 overflow-hidden sm:max-w-lg" dismissOnOutsideClick={false}>
        <DialogHeader className="space-y-1 border-b border-border/60 px-6 py-5 text-left">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <ConversationUserPicker
            {...picker}
            selectedIds={draftIds}
            onToggle={toggleUser}
            selectionMode="multiple"
            excludeIds={excludeIds}
            emptyHint="Nenhum usuário disponível para adicionar."
          />
        </div>

        <DialogFooter className="border-t border-border/60 bg-muted/20 px-6 py-4 sm:justify-between">
          <p className="text-xs text-muted-foreground sm:order-1">
            {draftIds.length} selecionado{draftIds.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2 sm:order-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={picker.loading}>
              {picker.loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
