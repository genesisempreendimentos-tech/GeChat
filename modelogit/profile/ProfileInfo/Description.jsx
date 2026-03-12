// src/components/views/profile/ProfileInfo/Description.jsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function Description({ description, setFormData, formData, isEditing }) {
  return (
    <div>
      <Label>Descrição</Label>
      {isEditing ? (
        <Textarea
          maxLength={200}
          value={description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      ) : (
        <Input disabled value={description || '—'} />
      )}
    </div>
  );
}