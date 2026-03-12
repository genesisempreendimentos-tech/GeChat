// src/components/views/profile/ProfileTabs/ProfileInfo.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { User, Edit, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext.jsx';
import { supabase } from '@/lib/customSupabaseClient.js';
import ImageCropDialog from '@/components/ImageCropDialog.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ProfilePublicView from '../ProfilePublicView';

// Componentes fracionados
import Photo from '../ProfileInfo/Photo';
import Name from '../ProfileInfo/Name';
import UserName from '../ProfileInfo/UserName';
import Profession from '../ProfileInfo/Profession';
import Description from '../ProfileInfo/Description';
import Birthday from '../ProfileInfo/Birthday';
import Social from '../ProfileInfo/Social';
import Since from '../ProfileInfo/Since';
import SealIcon, { normalizeSealId, getSealComp } from '../ProfileInfo/SealIcon';
import DDI from '../ProfileInfo/DDI';

// Helpers
const digitsOnly = (val) => (val || '').replace(/\D+/g, '');
const formatPhonePretty = (num) => {
  const d = digitsOnly(num);
  if (!d) return '';
  if (d.length <= 2) return d;
  if (d.length <= 4) return d.slice(0, 2) + ' ' + d.slice(2);
  if (d.length <= 9) return `${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 7)}-${d.slice(7, 11)}`;
};
const splitDialAndNumber = (rawInput) => {
  const m = String(rawInput || '').trim().match(/^\+?\d{1,4}/);
  if (m) {
    const dial = m[0].startsWith('+') ? m[0] : `+${m[0]}`;
    const rest = String(rawInput).trim().slice(m[0].length).trim();
    return { dial, number: rest };
  }
  return { dial: '+55', number: String(rawInput || '').trim() };
};
const parseBirthdayToYYYYMMDD = (val) => {
  if (!val) return null;
  const s = String(val).trim();
  const isoLike = /^(\d{4})[-/](\d{2})[-/](\d{2})$/;
  const brLike = /^(\d{2})[-/](\d{2})[-/](\d{4})$/;

  if (isoLike.test(s)) {
    const [, y, m, d] = s.match(isoLike);
    const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
    if (!isNaN(date)) return `${y}-${m}-${d}`;
    return null;
  }
  if (brLike.test(s)) {
    const [, dd, mm, yyyy] = s.match(brLike);
    const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
    if (!isNaN(date)) return `${yyyy}-${mm}-${dd}`;
    return null;
  }
  return null;
};

export default function ProfileInfo({ isViewOnly = false, userData: externalUserData = null }) {
  const { user: authUser, updateUserProfile, refreshUser } = useAuth();
  const user = externalUserData || authUser;

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [iconPopupOpen, setIconPopupOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    description: '',
    profession: '',
    birthday: '',
    linkedin: '',
    instagram: '',
    whatsapp: '',
    sealIcon: 'briefcase',
  });

  // WhatsApp DDI + número
  const { dialInit, numInit } = useMemo(() => {
    const { dial, number } = splitDialAndNumber(formData.whatsapp);
    return { dialInit: dial, numInit: number };
  }, [formData.whatsapp]);
  const [ddi, setDdi] = useState('+55');
  const [whatsNumber, setWhatsNumber] = useState('');

  useEffect(() => {
    setDdi(dialInit || '+55');
    setWhatsNumber(numInit || '');
  }, [dialInit, numInit]);

  // Flag para controlar se já inicializou os dados (evita resetar durante edição)
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Se estiver editando, não resetar os dados (preserva o que o usuário está digitando)
    if (isEditing && hasInitialized) return;
    
    // Se for dados externos (de outro usuário), usar diretamente da tabela users
    if (externalUserData) {
      const currentUsername = user.username || user.email?.split('@')[0] || '';
      
      let birthdayInput = '';
      if (user.birthday) {
        const ymd = parseBirthdayToYYYYMMDD(user.birthday);
        if (ymd) {
          const [y, m, d] = ymd.split('-');
          birthdayInput = `${d}/${m}/${y}`;
        } else {
          birthdayInput = user.birthday;
        }
      }

      setFormData({
        full_name: user.full_name || '',
        username: currentUsername,
        description: user.description || '',
        profession: user.profession || '',
        birthday: birthdayInput || '',
        linkedin: user.linkedin || '',
        instagram: user.instagram || '',
        whatsapp: user.whatsapp || '',
        sealIcon: normalizeSealId(user.seal_icon || 'briefcase'),
      });
      setAvatarPreview(user.avatar_url || null);
      setHasInitialized(true);
      return;
    }
    
    // Se for o próprio usuário, usar user_metadata
    const meta = user.user_metadata || {};
    const currentUsername = meta.username || user.email?.split('@')[0] || '';

    let birthdayInput = '';
    if (meta.birthday) {
      const ymd = parseBirthdayToYYYYMMDD(meta.birthday);
      if (ymd) {
        const [y, m, d] = ymd.split('-');
        birthdayInput = `${d}/${m}/${y}`;
      } else {
        birthdayInput = meta.birthday;
      }
    }

    setFormData({
      full_name: meta.full_name || '',
      username: currentUsername,
      description: meta.description || '',
      profession: meta.profession || '',
      birthday: birthdayInput || '',
      linkedin: meta.linkedin || '',
      instagram: meta.instagram || '',
      whatsapp: meta.whatsapp || '',
      sealIcon: normalizeSealId(meta.sealIcon || meta.seal_icon || 'briefcase'),
    });
    setAvatarPreview(meta.avatar_url || null);
    setHasInitialized(true);
  }, [user, externalUserData, isEditing, hasInitialized]);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  const handleCropComplete = (blob, url) => {
    setAvatarFile(blob);
    setAvatarPreview(url);
    setCropDialogOpen(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const profileUpdates = {};
      const metadataUpdates = { ...formData };

      // Obter avatar_url atual do banco para preservar se não houver nova imagem
      let currentAvatarUrl = null;
      if (externalUserData) {
        currentAvatarUrl = user.avatar_url || null;
      } else {
        currentAvatarUrl = user.user_metadata?.avatar_url || user.avatar_url || null;
      }

      // avatar upload - só atualizar se houver nova imagem
      if (avatarFile) {
        const filePath = `${user.id}/${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
        profileUpdates.avatar_url = publicUrl;
        metadataUpdates.avatar_url = publicUrl;
      } else {
        // Preservar avatar_url atual se não houver nova imagem
        profileUpdates.avatar_url = currentAvatarUrl;
        metadataUpdates.avatar_url = currentAvatarUrl;
      }

      const combinedWhats = `${ddi} ${whatsNumber}`.trim();
      metadataUpdates.whatsapp = combinedWhats;

      const birthdayYMD = parseBirthdayToYYYYMMDD(metadataUpdates.birthday);

      const { error: metaErr } = await updateUserProfile(profileUpdates, {
        ...metadataUpdates,
        birthday: birthdayYMD || metadataUpdates.birthday || null,
      });
      if (metaErr) throw metaErr;

      const { error: dbErr } = await supabase
        .from('users')
        .update({
          username: metadataUpdates.username || null,
          full_name: metadataUpdates.full_name || null,
          avatar_url: metadataUpdates.avatar_url || null, // Já preserva o valor atual se não houver nova imagem
          email: metadataUpdates.email || null,
          instagram: metadataUpdates.instagram || null,
          linkedin: metadataUpdates.linkedin || null,
          whatsapp: metadataUpdates.whatsapp || null,
          birthday: birthdayYMD,
          description: metadataUpdates.description || null,
          profession: metadataUpdates.profession || null,
          seal_icon: normalizeSealId(metadataUpdates.sealIcon),
        })
        .eq('id', user.id);
      if (dbErr) throw dbErr;

      toast({ title: 'Sucesso!', description: 'Perfil atualizado.' });
      await refreshUser();

      setIsEditing(false);
      setAvatarFile(null);
      setHasInitialized(false); // Resetar flag para permitir atualização após salvar
      setFormData((prev) => ({
        ...prev,
        whatsapp: combinedWhats,
        birthday: birthdayYMD
          ? (() => {
            const [y, m, d] = birthdayYMD.split('-');
            return `${d}/${m}/${y}`;
          })()
          : prev.birthday,
      }));
    } catch (e) {
      console.error(e);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar seu perfil.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (!user) return;
    setHasInitialized(false); // Resetar flag para permitir recarregar dados do banco
    const meta = user.user_metadata || {};

    let birthdayInput = '';
    if (meta.birthday) {
      const ymd = parseBirthdayToYYYYMMDD(meta.birthday);
      if (ymd) {
        const [y, m, d] = ymd.split('-');
        birthdayInput = `${d}/${m}/${y}`;
      } else {
        birthdayInput = meta.birthday;
      }
    }

    setFormData({
      full_name: meta.full_name || '',
      username: meta.username || user.email?.split('@')[0] || '',
      description: meta.description || '',
      profession: meta.profession || '',
      birthday: birthdayInput || '',
      linkedin: meta.linkedin || '',
      instagram: meta.instagram || '',
      whatsapp: meta.whatsapp || '',
      sealIcon: normalizeSealId(meta.sealIcon || meta.seal_icon || 'briefcase'),
    });
    const { dial, number } = splitDialAndNumber(meta.whatsapp || '');
    setDdi(dial || '+55');
    setWhatsNumber(number || '');
    setAvatarPreview(meta.avatar_url || null);
    setAvatarFile(null);
    setIsEditing(false);
  };

  const onChangeWhatsappInput = (e) => {
    const v = e.target.value || '';
    const pretty = formatPhonePretty(v);
    setWhatsNumber(pretty);
  };

  return (
    <>
      <Card className="bg-gray-300 dark:bg-slate-900/30 border border-slate-400 dark:border-slate-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="text-slate-700 dark:text-slate-300" />
              <span className="font-semibold">Informações pessoais</span>
            </CardTitle>
            {!isViewOnly && !isEditing && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPreviewDialogOpen(true)}>
                  <Eye className="w-4 h-4 mr-2" /> Preview Perfil Público
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" /> Editar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Photo Component */}
            <Photo
              avatarPreview={avatarPreview}
              fullName={formData.full_name}
              isEditing={isEditing && !isViewOnly}
              onEditClick={isViewOnly ? undefined : () => setCropDialogOpen(true)}
              getInitials={getInitials}
            />

          {/* Campos */}
          <div className="space-y-4">
            <Name
              fullName={formData.full_name}
              setFormData={setFormData}
              formData={formData}
              isEditing={isEditing}
            />

            <UserName
              username={formData.username}
              setFormData={setFormData}
              formData={formData}
              isEditing={isEditing}
            />

            <Profession
              profession={formData.profession}
              setFormData={setFormData}
              formData={formData}
              isEditing={isEditing}
              SealIconComponent={
                <SealIcon
                  sealIcon={formData.sealIcon}
                  setFormData={setFormData}
                  formData={formData}
                  isEditing={isEditing}
                  iconPopupOpen={iconPopupOpen}
                  setIconPopupOpen={setIconPopupOpen}
                />
              }
            />

            <Birthday
              birthday={formData.birthday}
              setFormData={setFormData}
              formData={formData}
              isEditing={isEditing}
            />

            <Description
              description={formData.description}
              setFormData={setFormData}
              formData={formData}
              isEditing={isEditing}
            />

            <Social
              formData={formData}
              setFormData={setFormData}
              isEditing={isEditing}
              ddi={ddi}
              whatsNumber={whatsNumber}
              onChangeWhatsappInput={onChangeWhatsappInput}
            />

            <Since user={user} />

            {isEditing && (
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={loading}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog crop */}
      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        onCropComplete={handleCropComplete}
      />

      {/* Dialog Preview Perfil Público */}
      <PreviewProfileDialog 
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        user={user}
      />
    </>
  );
}

// Componente Dialog para Preview do Perfil Público
function PreviewProfileDialog({ open, onOpenChange, user }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user?.id) {
      setLoading(true);
      // Buscar dados do usuário na tabela users para ter acesso completo aos dados públicos
      supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setUserData(data);
          }
          setLoading(false);
        });
    } else if (!open) {
      // Limpar dados quando fechar o dialog
      setUserData(null);
    }
  }, [open, user?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Preview - Perfil Público</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Carregando preview...</p>
            </div>
          ) : userData ? (
            <ProfilePublicView userData={userData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">
                Não foi possível carregar o preview do perfil.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}