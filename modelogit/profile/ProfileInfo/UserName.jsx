// src/components/views/profile/ProfileInfo/UserName.jsx
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MessageCircle, AlertCircle } from 'lucide-react';

export default function UserName({ username, setFormData, formData, isEditing }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleInputClick = () => {
    if (isEditing) {
      setDialogOpen(true);
    }
  };

  const handleContactWhatsApp = () => {
    const phoneNumber = '5521996159111'; // +55 21 99615-9111 (sem espaços e caracteres especiais)
    const message = encodeURIComponent(`Olá,\n\nGostaria de solicitar a troca do meu nome de usuário.\n\nNome de usuário atual: ${username || 'N/A'}\n\nAgradeço desde já.`);
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Nome de Usuário</Label>
          <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
            {(username || '').length}/50
          </span>
        </div>
        <Input
          value={username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          disabled={!isEditing}
          maxLength={50}
          onClick={handleInputClick}
          readOnly={isEditing}
          className={isEditing ? 'cursor-pointer' : ''}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <DialogTitle>Troca de Nome de Usuário</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              A troca de nome de usuário é um dado sensível e requer autorização da administração.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Entre em contato com a administração solicitando a troca:
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleContactWhatsApp}
              className="bg-[#1A9386] hover:bg-[#1A9386]/90"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Entrar em Contato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}