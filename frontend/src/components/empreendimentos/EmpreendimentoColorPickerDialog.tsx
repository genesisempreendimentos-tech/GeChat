import { Fragment } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  EMPREENDIMENTO_COLOR_COUNT,
  EMPREENDIMENTO_COLOR_GROUPS,
  getEmpreendimentoColorOption,
  type EmpreendimentoColorToken,
} from '@/lib/brandColors';

type EmpreendimentoColorPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: EmpreendimentoColorToken;
  onSelect: (token: EmpreendimentoColorToken) => void;
  /** token → nome do empreendimento que já usa a cor */
  usedBy?: Map<EmpreendimentoColorToken, string>;
};

function ColorSwatch({
  token,
  hex,
  isSelected,
  isTaken,
  takenBy,
  onSelect,
}: {
  token: EmpreendimentoColorToken;
  hex: string;
  isSelected: boolean;
  isTaken: boolean;
  takenBy?: string;
  onSelect: () => void;
}) {
  const button = (
    <button
      type="button"
      title={isTaken ? undefined : token}
      disabled={isTaken}
      onClick={() => {
        if (isTaken) return;
        onSelect();
      }}
      className={cn(
        'relative mx-auto flex h-9 w-9 items-center justify-center rounded-full transition-transform',
        isTaken ? 'cursor-not-allowed opacity-75' : 'hover:scale-110',
        isSelected && !isTaken && 'scale-110 ring-2 ring-primary ring-offset-2',
        isTaken && 'ring-2 ring-red-500 ring-offset-2',
      )}
    >
      <span
        className={cn(
          'h-7 w-7 rounded-full border border-black/10 shadow-sm',
          isTaken && 'opacity-60',
        )}
        style={{ backgroundColor: hex }}
      />
    </button>
  );

  if (!isTaken) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="mx-auto inline-flex">{button}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-center">
        <p className="text-xs">
          Em uso por <span className="font-semibold">{takenBy}</span>
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export function EmpreendimentoColorPickerDialog({
  open,
  onOpenChange,
  value,
  onSelect,
  usedBy,
}: EmpreendimentoColorPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Selecionar cor</DialogTitle>
          <DialogDescription>
            Escolha uma das {EMPREENDIMENTO_COLOR_COUNT} cores de marca. Cada cor só pode ser usada
            por um empreendimento.
          </DialogDescription>
        </DialogHeader>
        <TooltipProvider delayDuration={200}>
          <div className="space-y-4 py-1">
            {EMPREENDIMENTO_COLOR_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                  {group.tokens.map((token) => {
                    const option = getEmpreendimentoColorOption(token);
                    if (!option) return null;
                    const takenBy = usedBy?.get(token);
                    const isTaken = Boolean(takenBy);

                    return (
                      <Fragment key={token}>
                        <ColorSwatch
                          token={token}
                          hex={option.hex}
                          isSelected={value === token}
                          isTaken={isTaken}
                          takenBy={takenBy}
                          onSelect={() => {
                            onSelect(token);
                            onOpenChange(false);
                          }}
                        />
                      </Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
