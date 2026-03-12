// src/components/views/profile/ProfileInfo/Profession.jsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Profession({ profession, setFormData, formData, isEditing, SealIconComponent }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label>Profissão e Selo</Label>
        <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {(profession || '').length}/100
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={profession}
          onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
          disabled={!isEditing}
          maxLength={100}
        />
        {SealIconComponent}
      </div>
    </div>
  );
}