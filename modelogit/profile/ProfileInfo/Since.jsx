// src/components/views/profile/ProfileInfo/Since.jsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Since({ user }) {
  return (
    <div className="mt-2">
      <Label>Membro desde</Label>
      <Input
        disabled
        value={
          user?.created_at
            ? format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ptBR })
            : 'N/A'
        }
      />
    </div>
  );
}