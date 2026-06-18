import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  EMPREENDIMENTO_COLOR_OPTIONS,
  type EmpreendimentoColorToken,
} from '@/lib/brandColors';

type EmpreendimentoColorPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: EmpreendimentoColorToken;
  onSelect: (token: EmpreendimentoColorToken) => void;
};

export function EmpreendimentoColorPickerDialog({
  open,
  onOpenChange,
  value,
  onSelect,
}: EmpreendimentoColorPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Selecionar cor</DialogTitle>
          <DialogDescription>Escolha uma das 20 cores de marca.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-5 gap-3 py-2">
          {EMPREENDIMENTO_COLOR_OPTIONS.map((option) => (
            <button
              key={option.token}
              type="button"
              title={option.token}
              onClick={() => {
                onSelect(option.token);
                onOpenChange(false);
              }}
              className={cn(
                'mx-auto flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-110',
                value === option.token && 'ring-2 ring-offset-2 ring-primary scale-110',
              )}
            >
              <span
                className="h-8 w-8 rounded-full shadow-sm border border-black/10"
                style={{ backgroundColor: option.hex }}
              />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
