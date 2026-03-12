// src/components/views/profile/ProfileInfo/Birthday.jsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { handleDateInputChange } from '@/lib/dateFormatter';

export default function Birthday({ birthday, setFormData, formData, isEditing }) {
  const handleChange = (e) => {
    const formatted = handleDateInputChange(e);
    setFormData({ ...formData, birthday: formatted });
  };

  return (
    <div>
      <Label>Data de Aniversário</Label>
      <Input
        placeholder="dd/mm/aaaa"
        value={birthday || ''}
        onChange={handleChange}
        maxLength={10}
        disabled={!isEditing}
      />
    </div>
  );
}