import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LoadingGif } from '@/components/LoadingGif';
import {
  User,
  Image as ImageIcon,
  AtSign,
  Quote,
  Linkedin,
  Instagram,
  MessageCircle,
  Save,
  Check,
  X,
  Upload,
} from 'lucide-react';
import { databaseService, storageService } from '@/services/supabase';
import type { ProfileFormData } from '../ProfileView';
import { IconPickerButton, PROFILE_ICONS, ICON_MAP } from './IconPickerButton';

interface ProfileInfoTabProps {
  formData: ProfileFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>;
  avatarUrl: string;
  setAvatarUrl: React.Dispatch<React.SetStateAction<string>>;
  currentUserId: string | null;
  onUserUpdate: (data: { name?: string; avatar?: string }) => void;
}

export function ProfileInfoTab({
  formData,
  setFormData,
  avatarUrl,
  setAvatarUrl,
  currentUserId,
  onUserUpdate,
}: ProfileInfoTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSaveProfile = async () => {
    if (!currentUserId) return;
    setSaving(true);
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
        linkedin: formData.linkedin,
        instagram: formData.instagram,
        whatsapp: formData.whatsapp,
      });
      if (error) {
        setErrorMessage('Erro ao salvar perfil: ' + error.message);
      } else {
        onUserUpdate({ name: formData.name || formData.apelido, avatar: avatarUrl });
        setSuccessMessage('Perfil atualizado com sucesso!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err: unknown) {
      setErrorMessage('Erro ao salvar perfil: ' + (err as Error).message);
    }
    setSaving(false);
  };

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
    <div className="space-y-6">
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 border border-primary text-primary px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <Check className="w-5 h-5" />
          <span>{successMessage}</span>
        </motion.div>
      )}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <X className="w-5 h-5" />
          <span>{errorMessage}</span>
        </motion.div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Público</CardTitle>
          <CardDescription>Suas informações de perfil e redes sociais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Foto do perfil */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Foto do perfil
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-border bg-muted flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto do perfil" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <LoadingGif size="sm" className="mr-2 inline-block" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Carregar foto
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG ou GIF. Máx. 5MB.</p>
              </div>
            </div>
          </div>

          {/* Apelido; Username + Ícone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Apelido
              </label>
              <Input
                value={formData.apelido}
                onChange={(e) => setFormData({ ...formData, apelido: e.target.value })}
                placeholder="Como prefere ser chamado(a)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <AtSign className="w-4 h-4" />
                Username
                <span className="text-muted-foreground font-normal text-xs ml-1">· Ícone</span>
              </label>
              <div className="flex gap-2">
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="@usuario"
                  className="flex-1 min-w-0"
                />
                <IconPickerButton
                  formData={formData}
                  setFormData={setFormData}
                  iconMap={ICON_MAP}
                  profileIcons={PROFILE_ICONS}
                />
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Quote className="w-4 h-4" />
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Conte um pouco sobre você..."
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* LinkedIn; Instagram; WhatsApp */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Linkedin className="w-4 h-4" />
                LinkedIn
              </label>
              <Input
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                placeholder="linkedin.com/in/seu-perfil"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Instagram className="w-4 h-4" />
                Instagram
              </label>
              <Input
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="@seuusuario"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </label>
              <Input
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={saving} className="w-full md:w-auto">
            {saving ? (
              <>
                <LoadingGif size="sm" className="mr-2 inline-block" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar alterações
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
