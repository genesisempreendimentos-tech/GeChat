import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { databaseService, supabase, storageService } from '@/services/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingGif } from '@/components/LoadingGif';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfileCard } from '@/components/profile';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase,
  Calendar,
  Linkedin,
  Instagram,
  MessageCircle,
  Lock,
  Camera,
  Save,
  Check,
  X,
  Upload
} from 'lucide-react';

export default function ProfilePage() {
  const { user: currentUser, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para gerar username a partir do nome
  const generateUsername = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/\s+/g, '') // Remove espaços
      .replace(/[^a-z0-9]/g, ''); // Remove caracteres especiais
  };

  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: '',
    location: '',
    jobTitle: '',
    bio: '',
    birthDate: '',
    linkedin: '',
    instagram: '',
    whatsapp: '',
  });

  // Gerar username automaticamente quando o nome mudar
  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name });
  };

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [avatarUrl, setAvatarUrl] = useState(
    currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.email}`
  );
  // Carregar dados do usuário do Supabase quando o componente montar
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser?.id) return;
      
      setLoading(true);
      try {
        const { data, error } = await databaseService.getUserById(currentUser.id);
        
        if (error) {
          console.error('Erro ao carregar dados do usuário:', error);
          return;
        }
        
        if (data) {
          setFormData({
            name: data.name || currentUser?.name || '',
            email: data.email || currentUser?.email || '',
            phone: data.phone || '',
            location: data.location || '',
            jobTitle: data.job_title || '',
            bio: data.bio || '',
            birthDate: data.birth_date || '',
            linkedin: data.linkedin || '',
            instagram: data.instagram || '',
            whatsapp: data.whatsapp || '',
          });
          
          if (data.avatar) {
            setAvatarUrl(data.avatar);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [currentUser?.id]);
  const handleSaveProfile = async () => {
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (!currentUser?.id) return;

      const { error } = await databaseService.updateUser(currentUser.id, {
        name: formData.name,
        phone: formData.phone,
        location: formData.location,
        job_title: formData.jobTitle,
        bio: formData.bio,
        birth_date: formData.birthDate,
        linkedin: formData.linkedin,
        instagram: formData.instagram,
        whatsapp: formData.whatsapp,
        avatar: avatarUrl,
      });

      if (error) {
        setErrorMessage('Erro ao salvar perfil: ' + error.message);
      } else {
        // Atualizar store local
        updateUser({
          name: formData.name,
          avatar: avatarUrl,
        });
        setSuccessMessage('Perfil atualizado com sucesso!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err: any) {
      setErrorMessage('Erro ao salvar perfil: ' + err.message);
    }

    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('As senhas não coincidem');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (!passwordData.currentPassword) {
      setErrorMessage('Digite a senha atual');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Primeiro verifica a senha atual fazendo login
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser!.email,
        password: passwordData.currentPassword,
      });

      if (signInError) {
        setErrorMessage('Senha atual incorreta');
        setSaving(false);
        return;
      }

      // Agora altera a senha
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setSuccessMessage('Senha alterada com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao alterar senha');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecione uma imagem válida');
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (!currentUser?.id) return;

      // Upload para Supabase Storage
      const { url, error: uploadError } = await storageService.uploadAvatar(currentUser.id, file);

      if (uploadError || !url) {
        throw new Error('Erro ao fazer upload da imagem');
      }

      // Atualizar URL do avatar
      setAvatarUrl(url);

      // Atualizar no banco
      const { error: updateError } = await databaseService.updateUser(currentUser.id, {
        avatar: url,
      });

      if (updateError) {
        throw new Error('Erro ao atualizar perfil');
      }

      // Atualizar store local
      updateUser({ avatar: url });

      setSuccessMessage('Imagem atualizada com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao fazer upload da imagem');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const generateAvatar = (seed: string) => {
    setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas informações pessoais e preferências
        </p>
      </div>

      {/* Mensagens de Sucesso e Erro */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
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
          exit={{ opacity: 0 }}
          className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <X className="w-5 h-5" />
          <span>{errorMessage}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar Card 3D Animado */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-4"
        >
          {/* ProfileCard 3D */}
          <div className="flex justify-center">
            <ProfileCard 
              enableTilt={true}
              showUserInfo={true}
              iconUrl="/assets/logo-gen-sem-fundo-svg.svg"
              userData={{
                name: formData.name,
                email: formData.email,
                avatar: avatarUrl,
                profession: formData.jobTitle || 'Membro da equipe',
                username: generateUsername(formData.name) || formData.email.split('@')[0],
                bio: formData.bio,
                birthDate: formData.birthDate,
                instagram: formData.instagram,
                linkedin: formData.linkedin,
                whatsapp: formData.whatsapp,
              }}
            />
          </div>

          {/* Upload de Imagem */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
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
                    Carregar Imagem
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Imagens até 5MB (JPG, PNG, GIF)
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Informações Pessoais */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize suas informações de perfil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {successMessage && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600 border border-green-500/20">
                  <Check className="w-4 h-4" />
                  <span className="text-sm">{successMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-600 border border-red-500/20">
                  <X className="w-4 h-4" />
                  <span className="text-sm">{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nome Completo
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <Input
                    value={formData.email}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Telefone
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Cargo
                  </label>
                  <Input
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    placeholder="Seu cargo"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Data de Nascimento
                  </label>
                  <Input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Localização
                  </label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Cidade, Estado"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Conte um pouco sobre você..."
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                />
              </div>

              <div className="pt-4">
                <Button onClick={handleSaveProfile} disabled={saving} className="w-full md:w-auto">
                  {saving ? (
                    <>
                      <LoadingGif size="sm" className="mr-2 inline-block" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Links Sociais */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle>Links Sociais</CardTitle>
              <CardDescription>Adicione seus links profissionais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>
        </motion.div>

        {/* Segurança */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>Altere sua senha</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Senha Atual
                </label>
                <Input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Nova Senha
                </label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Confirmar Senha
                </label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <Button 
                onClick={handleChangePassword} 
                variant="outline"
                className="w-full"
              >
                <Lock className="w-4 h-4 mr-2" />
                Alterar Senha
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
