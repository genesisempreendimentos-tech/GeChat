// src/components/views/profile/ProfileInfo/Social.jsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Instagram as InstagramIcon, Linkedin as LinkedinIcon, MessageCircle as WhatsappIcon } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import DDI from './DDI';

// Helpers para construir URLs
const digitsOnly = (val) => (val || '').replace(/\D+/g, '');
const buildInstagramUrl = (raw) => {
  if (!raw) return '';
  let v = String(raw).trim();
  try {
    if (v.startsWith('http')) return v;
    if (v.startsWith('@')) v = v.slice(1);
    v = v.replace(/^\/+|\/+$/g, '');
    return `https://www.instagram.com/${v}/`;
  } catch { return ''; }
};
const buildLinkedinUrl = (raw) => {
  if (!raw) return '';
  const v = String(raw).trim();
  if (v.startsWith('http')) return v;
  return `https://www.linkedin.com/in/${v.replace(/^in\//, '').replace(/^@/, '')}`;
};
const buildWhatsappUrl = (rawWhats, fullName, username) => {
  if (!rawWhats) return '';
  const phone = digitsOnly(rawWhats);
  if (!phone) return '';
  const displayName = fullName?.trim() || username || 'usuário';
  const msg = `Olá, sou o ${displayName} e vim do GêTask!`;
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
};

export default function Social({
  formData,
  setFormData,
  isEditing,
  whatsNumber,
  onChangeWhatsappInput
}) {
  const ddi = formData.ddi ?? '+55';

  const openInstagram = () => {
    const url = buildInstagramUrl(formData.instagram);
    if (!url) return toast({ title: 'Instagram inválido', variant: 'destructive' });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openLinkedin = () => {
    const url = buildLinkedinUrl(formData.linkedin);
    if (!url) return toast({ title: 'LinkedIn inválido', variant: 'destructive' });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openWhatsapp = () => {
    const raw = `${ddi} ${whatsNumber}`;
    const url = buildWhatsappUrl(raw, formData.full_name, formData.username);
    if (!url) return toast({ title: 'WhatsApp inválido', variant: 'destructive' });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div>
      <Label>Redes Sociais</Label>

      {/* Instagram */}
      <div className="flex items-center gap-2 mt-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={openInstagram}
          title="Abrir Instagram"
        >
          <InstagramIcon className="w-4 h-4 text-pink-600" />
        </Button>
        <Input
          placeholder="@ do instagram"
          value={formData.instagram}
          onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
          disabled={!isEditing}
          maxLength={200}
        />
      </div>

      {/* WhatsApp */}
      <div className="flex items-center gap-2 mt-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={openWhatsapp}
          title="Abrir WhatsApp"
        >
          <WhatsappIcon className="w-4 h-4 text-green-600" />
        </Button>

        {/* DDI controlado por formData.ddi */}
        <DDI
          value={ddi}
          onChange={(newDial) => setFormData(prev => ({ ...prev, ddi: newDial }))}
          disabled={!isEditing}
        />

        {/* Input com prefixo DDI overlay (sincronizado com formData.ddi) */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 select-none text-slate-400 dark:text-slate-500 font-mono">
            {ddi}
          </span>
          <Input
            placeholder="(DDD) número"
            className="pl-14"
            value={whatsNumber}
            onChange={onChangeWhatsappInput}
            disabled={!isEditing}
            maxLength={20}
          />
        </div>
      </div>

      {/* LinkedIn */}
      <div className="flex items-center gap-2 mt-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={openLinkedin}
          title="Abrir LinkedIn"
        >
          <LinkedinIcon className="w-4 h-4 text-[#0A66C2]" />
        </Button>
        <Input
          placeholder="Link do perfil do Linkdin"
          value={formData.linkedin}
          onChange={(e) => setFormData(prev => ({ ...prev, linkedin: e.target.value }))}
          disabled={!isEditing}
          maxLength={200}
        />
      </div>
    </div>
  );
}
