import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingGif } from '@/components/LoadingGif';
import {
  User,
  AtSign,
  Quote,
  Linkedin,
  Instagram,
  Check,
  X,
  Upload,
  Globe,
  Cat,
} from 'lucide-react';
import { WhatsappIcon } from '@/components/icons/WhatsappIcon';
import { databaseService, storageService } from '@/services/supabase';
import type { ProfileFormData } from '../ProfileView';
import { MascotePickerButton } from './MascotePickerButton';

interface ProfileInfoTabProps {
  formData: ProfileFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>;
  avatarUrl: string;
  setAvatarUrl: React.Dispatch<React.SetStateAction<string>>;
  currentUserId: string | null;
  onUserUpdate: (data: { name?: string; avatar?: string }) => void;
  onSaveSuccess?: () => void;
  onSavingChange?: (saving: boolean) => void;
}

export const ProfileInfoTab = forwardRef<{ save: () => Promise<void> }, ProfileInfoTabProps>(function ProfileInfoTab({
  formData,
  setFormData,
  avatarUrl,
  setAvatarUrl,
  currentUserId,
  onUserUpdate,
  onSaveSuccess,
  onSavingChange,
}, ref) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSaveProfile = async () => {
    if (!currentUserId) return;
    setSaving(true);
    onSavingChange?.(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const { error } = await databaseService.updateUser(currentUserId, {
        name: formData.name || formData.apelido,
        avatar: avatarUrl,
        apelido: formData.apelido,
        username: formData.username,
        bio: formData.bio,
        icon: formData.icon,
        mascote: formData.mascote || undefined,
        linkedin: formData.linkedin,
        instagram: formData.instagram,
        whatsapp: formData.whatsapp,
      });
      if (error) {
        setErrorMessage('Erro ao salvar perfil: ' + error.message);
      } else {
        onUserUpdate({ name: formData.name || formData.apelido, avatar: avatarUrl });
        onSaveSuccess?.();
        setSuccessMessage('Perfil atualizado com sucesso!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err: unknown) {
      setErrorMessage('Erro ao salvar perfil: ' + (err as Error).message);
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }
  };

  useImperativeHandle(ref, () => ({ save: handleSaveProfile }), [formData, avatarUrl, currentUserId]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecione uma imagem válida');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('A imagem deve ter no máximo 5MB');
      return;
    }
    setUploading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const { url, error: uploadError } = await storageService.uploadAvatar(currentUserId, file);
      if (uploadError || !url) throw new Error('Erro ao fazer upload da imagem');
      setAvatarUrl(url);
      await databaseService.updateUser(currentUserId, { avatar: url });
      onUserUpdate({ avatar: url });
      setSuccessMessage('Foto atualizada com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message ?? 'Erro ao fazer upload da imagem');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      {/* Toasts */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm"
        >
          <Check className="w-4 h-4 shrink-0" />
          {successMessage}
        </motion.div>
      )}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm"
        >
          <X className="w-4 h-4 shrink-0" />
          {errorMessage}
        </motion.div>
      )}

      {/* ── Seção: Identidade ───────────────────────────────────── */}
      <div className="rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/20 overflow-hidden">
        {/* Header da seção */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50 bg-muted/20">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Perfil público</p>
            <p className="text-xs text-muted-foreground">Suas informações visíveis para outros</p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Foto do perfil */}
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-border/60 bg-muted shadow-sm">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto do perfil" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-9 h-9 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                  <LoadingGif size="sm" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <p className="text-sm font-medium mb-1">Foto do perfil</p>
              <p className="text-xs text-muted-foreground mb-3">JPG, PNG ou GIF · Máx. 5MB</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2 text-xs h-8"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploading ? 'Enviando...' : 'Carregar foto'}
              </Button>
            </div>
          </div>

          <div className="border-t border-border/40" />

          {/* Apelido + Username + Ícone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <User className="w-3 h-3" /> Apelido
              </label>
              <Input
                value={formData.apelido}
                onChange={(e) => setFormData({ ...formData, apelido: e.target.value })}
                placeholder="Como prefere ser chamado(a)"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <AtSign className="w-3 h-3" /> Username
              </label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="@usuario"
                className="w-full h-9 text-sm"
              />
            </div>
          </div>

          {/* Mascote */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Cat className="w-3 h-3" /> Mascote
            </label>
            <MascotePickerButton
              value={formData.mascote}
              onChange={(mascote) => setFormData({ ...formData, mascote })}
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Quote className="w-3 h-3" /> Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Conte um pouco sobre você..."
              rows={3}
              className="w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
      </div>

      {/* ── Seção: Redes sociais ────────────────────────────────── */}
      <div className="rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/20 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50 bg-muted/20">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-semibold">Redes sociais</p>
            <p className="text-xs text-muted-foreground">Links para seus perfis nas redes</p>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                <span className="text-[#0A66C2]">LinkedIn</span>
              </label>
              <Input
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                placeholder="linkedin.com/in/seu-perfil"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />
                <span className="text-[#E1306C]">Instagram</span>
              </label>
              <Input
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="@seuusuario"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <WhatsappIcon className="w-3.5 h-3.5 text-[#25D366]" />
                <span className="text-[#25D366]">WhatsApp</span>
              </label>
              <Input
                value={formData.whatsapp}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, '');
                  if (v.length > 11) v = v.slice(0, 11);
                  if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                  if (v.length > 10) v = `${v.slice(0, 10)}-${v.slice(10)}`;
                  setFormData({ ...formData, whatsapp: v });
                }}
                placeholder="(00) 00000-0000"
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
