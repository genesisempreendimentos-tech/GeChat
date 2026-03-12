// src/components/views/profile/ProfileInfo/Name.jsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Name({ fullName, setFormData, formData, isEditing }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label>Nome</Label>
        <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {(fullName || '').length}/100
        </span>
      </div>
      <Input
        value={fullName}
        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
        disabled={!isEditing}
        maxLength={100}
      />
    </div>
  );
}