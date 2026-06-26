import { useState } from 'react';
import { MessageSquarePlus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CreateConversationHub, type ConversationCreateKind } from './conversation-create/CreateConversationHub';
import { CreateDirectConversationDialog } from './conversation-create/CreateDirectConversationDialog';
import { CreateGroupConversationDialog } from './conversation-create/CreateGroupConversationDialog';
import { CreateChannelConversationDialog } from './conversation-create/CreateChannelConversationDialog';

interface NewConversationDialogProps {
  onCreated: (conversationId: string) => void;
  className?: string;
  triggerIconOnly?: boolean;
  prominent?: boolean;
}

const prominentTriggerClass =
  'border-0 bg-primary font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30';

export function NewConversationDialog({
  onCreated,
  className,
  triggerIconOnly,
  prominent = false,
}: NewConversationDialogProps) {
  const [hubOpen, setHubOpen] = useState(false);
  const [directOpen, setDirectOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false);

  const handlePick = (kind: ConversationCreateKind) => {
    if (kind === 'direct') setDirectOpen(true);
    if (kind === 'group') setGroupOpen(true);
    if (kind === 'channel') setChannelOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        variant={prominent ? 'default' : 'outline'}
        size={triggerIconOnly ? 'icon' : 'sm'}
        className={cn(
          prominent && prominentTriggerClass,
          triggerIconOnly && prominent && 'h-11 w-11 rounded-xl shadow-primary/30 ring-1 ring-primary/30',
          !triggerIconOnly && prominent && 'h-10 w-full gap-2',
          className ?? (!triggerIconOnly ? 'gap-1.5' : undefined),
        )}
        aria-label="Nova conversa"
        onClick={() => setHubOpen(true)}
      >
        {prominent ? (
          <MessageSquarePlus className={cn('shrink-0', triggerIconOnly ? 'h-5 w-5' : 'h-4 w-4')} />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {!triggerIconOnly && (prominent ? 'Nova conversa' : 'Iniciar nova conversa')}
      </Button>

      <CreateConversationHub open={hubOpen} onOpenChange={setHubOpen} onSelect={handlePick} />

      <CreateDirectConversationDialog
        open={directOpen}
        onOpenChange={setDirectOpen}
        onCreated={onCreated}
      />

      <CreateGroupConversationDialog
        open={groupOpen}
        onOpenChange={setGroupOpen}
        onCreated={onCreated}
      />

      <CreateChannelConversationDialog
        open={channelOpen}
        onOpenChange={setChannelOpen}
        onCreated={onCreated}
      />
    </>
  );
}
