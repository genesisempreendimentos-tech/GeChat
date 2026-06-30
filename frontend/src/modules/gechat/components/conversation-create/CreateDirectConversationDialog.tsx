import { useState } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { gechatApi } from '@/modules/gechat/services/gechat-api';
import { toast } from 'sonner';
import {
  ConversationUserPicker,
  finalizeConversationCreate,
  useConversationUsers,
} from './shared';

interface CreateDirectConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (conversationId: string) => void;
}

export function CreateDirectConversationDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateDirectConversationDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const picker = useConversationUsers(open);

  const handleOpenChange = (next: boolean) => {
    if (!next) setSelectedUserId(null);
    onOpenChange(next);
  };

  const toggleUser = (id: string) => {
    setSelectedUserId((current) => (current === id ? null : id));
  };

  const handleCreate = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    try {
      const conv = await gechatApi.createDirect(selectedUserId);
      await finalizeConversationCreate(conv, onCreated);
      setSelectedUserId(null);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível iniciar a conversa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-lg gap-0 p-0 overflow-hidden"
        entranceStyle="subtle"
        dismissOnOutsideClick={false}
      >
        <DialogHeader className="space-y-3 border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div className="min-w-0 pt-0.5">
              <DialogTitle>Mensagem direta</DialogTitle>
              <DialogDescription className="mt-1">
                Escolha uma pessoa para iniciar uma conversa privada.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4">
          <ConversationUserPicker
            {...picker}
            selectedIds={selectedUserId ? [selectedUserId] : []}
            onToggle={toggleUser}
            selectionMode="single"
            emptyHint="Nenhum colega disponível para conversa direta."
          />
        </div>

        <DialogFooter className="border-t border-border/60 bg-muted/20 px-6 py-4 sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleCreate} disabled={loading || !selectedUserId}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Abrindo...
              </>
            ) : (
              'Iniciar conversa'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
