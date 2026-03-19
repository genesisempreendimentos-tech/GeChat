import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MAX_FAVORITE_APPS_PER_USER } from '@/services/supabase';

export interface FavoriteLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Modal exibido ao tentar favoritar além do máximo permitido por usuário. */
export function FavoriteLimitDialog({ open, onOpenChange }: FavoriteLimitDialogProps) {
  const max = MAX_FAVORITE_APPS_PER_USER;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Limite de favoritos</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">
                Você atingiu o limite de aplicativos favoritos.
              </p>
              <p>
                É permitido adicionar no máximo <strong className="text-foreground">{max}</strong>{' '}
                aplicativos à sua lista de favoritos.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
