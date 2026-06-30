import { useState } from 'react';
import { Hash, Loader2, Megaphone } from 'lucide-react';
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
import type { ChannelSubtype } from '@/modules/gechat/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ConversationUserPicker,
  finalizeConversationCreate,
  SelectedMemberChips,
  useConversationUsers,
} from './shared';

const CHANNEL_SUBTYPES: Array<{
  value: ChannelSubtype;
  label: string;
  hint: string;
}> = [
  { value: 'geral', label: 'Geral', hint: 'Discussões abertas' },
  { value: 'setor', label: 'Setor', hint: 'Time ou área' },
  { value: 'projeto', label: 'Projeto', hint: 'Entrega específica' },
  { value: 'avisos', label: 'Avisos', hint: 'Somente admin publica' },
];

interface CreateChannelConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (conversationId: string) => void;
}

export function CreateChannelConversationDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateChannelConversationDialogProps) {
  const [name, setName] = useState('');
  const [channelSubtype, setChannelSubtype] = useState<ChannelSubtype>('geral');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const picker = useConversationUsers(open);

  const reset = () => {
    setName('');
    setChannelSubtype('geral');
    setSelectedUsers([]);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const toggleUser = (id: string) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id],
    );
  };

  const canCreate = name.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate) return;
    setLoading(true);
    try {
      const conv = await gechatApi.createChannel(name.trim(), channelSubtype, selectedUsers);
      await finalizeConversationCreate(conv, onCreated);
      reset();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível criar o canal.');
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
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400">
              <Hash className="h-5 w-5" />
            </span>
            <div className="min-w-0 pt-0.5">
              <DialogTitle>Novo canal</DialogTitle>
              <DialogDescription className="mt-1">
                Organize comunicações por tema, setor ou avisos oficiais.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          <div className="space-y-2">
            <label htmlFor="channel-name" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Nome do canal
            </label>
            <Input
              id="channel-name"
              placeholder="Ex.: Avisos RH"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 border-border/60 bg-muted/30"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tipo</p>
            <div className="grid grid-cols-2 gap-2">
              {CHANNEL_SUBTYPES.map((subtype) => (
                <button
                  key={subtype.value}
                  type="button"
                  onClick={() => setChannelSubtype(subtype.value)}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-left transition-colors',
                    channelSubtype === subtype.value
                      ? 'border-primary/40 bg-primary/10 ring-1 ring-primary/20'
                      : 'border-border/60 bg-muted/20 hover:bg-muted/40',
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {subtype.value === 'avisos' && <Megaphone className="h-3.5 w-3.5" />}
                    {subtype.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{subtype.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <SelectedMemberChips
            users={picker.users}
            selectedIds={selectedUsers}
            onRemove={(id) => setSelectedUsers((prev) => prev.filter((uid) => uid !== id))}
          />

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Membros <span className="font-normal normal-case">(opcional)</span>
            </p>
            <ConversationUserPicker
              {...picker}
              selectedIds={selectedUsers}
              onToggle={toggleUser}
              selectionMode="multiple"
            />
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
              'Criar canal'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
