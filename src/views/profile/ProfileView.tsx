import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import ProfileCard from '@/components/profile/ProfileCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/authStore';
import { databaseService } from '@/services/supabase';
import { getCorporateProfile } from '@/services/corporateProfile';
import type { CorporativoFormData } from '@/services/corporateProfile';
import { ProfileBanner } from './ProfileBanner/ProfileBanner';
import { ProfileInfoTab } from './ProfileTabs/ProfileInfoTab';
import { ProfileSecurityTab } from './ProfileTabs/ProfileSecurityTab';
import { ProfileCorporativoTab } from './ProfileTabs/ProfileCorporativoTab';
import { User, Lock, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProfileFormData {
  name: string;
  email: string;
  apelido: string;
  username: string;
  bio: string;
  icon: string;
  linkedin: string;
  instagram: string;
  whatsapp: string;
  phone?: string;
  location?: string;
  jobTitle?: string;
  birthDate?: string;
}

function generateUsername(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function ProfileView() {
  const { user: currentUser, updateUser } = useAuthStore();
  const [formData, setFormData] = useState<ProfileFormData>({
    name: currentUser?.name ?? '',
    email: currentUser?.email ?? '',
    apelido: '',
    username: currentUser?.email?.split('@')[0] ?? '',
    bio: '',
    icon: '',
    linkedin: '',
    instagram: '',
    whatsapp: '',
  });
  const [avatarUrl, setAvatarUrl] = useState(
    currentUser?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.email ?? 'user'}`
  );
  const [corporateDepartamento, setCorporateDepartamento] = useState('');
  const [corporateData, setCorporateData] = useState<CorporativoFormData | null>(null);
  const [corporateLoading, setCorporateLoading] = useState(true);
  const [corporateNotFound, setCorporateNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!currentUser?.id) return;
      const { data } = await databaseService.getUserById(currentUser.id);
      const d = data as Record<string, unknown> | null;
      if (d) {
        const getStr = (key: string) => {
          const v = d[key];
          if (v == null) return '';
          return String(v);
        };
        setFormData({
          name: (d.name as string) ?? currentUser?.name ?? '',
          email: (d.email as string) ?? currentUser?.email ?? '',
          apelido: getStr('apelido'),
          username: getStr('username') || (currentUser?.email?.split('@')[0] ?? ''),
          bio: getStr('bio'),
          icon: getStr('icon'),
          linkedin: getStr('linkedin'),
          instagram: getStr('instagram'),
          whatsapp: getStr('whatsapp'),
          phone: getStr('phone'),
          location: getStr('location'),
          jobTitle: (d.job_title as string) ?? '',
          birthDate: (d.birth_date as string) ?? '',
        });
        if (d.avatar) setAvatarUrl(d.avatar as string);
      }
    };
    load();
  }, [currentUser?.id, currentUser?.name, currentUser?.email]);

  const loadCorporate = useCallback(async () => {
    if (!currentUser?.email) {
      setCorporateLoading(false);
      setCorporateNotFound(true);
      return;
    }
    setCorporateLoading(true);
    const result = await getCorporateProfile();
    setCorporateLoading(false);
    setCorporateNotFound(result.notFound);
    if (!result.notFound && result.data) {
      setCorporateData(result.data);
      if (result.data.departamento) setCorporateDepartamento(result.data.departamento);
    } else {
      setCorporateData(null);
    }
  }, [currentUser?.email]);

  useEffect(() => {
    loadCorporate();
  }, [loadCorporate]);

  const userDataForCard = useCallback(
    () => ({
      name: corporateData?.name || formData.name || formData.apelido,
      full_name: corporateData?.name || formData.name || formData.apelido,
      apelido: formData.apelido,
      email: formData.email,
      avatar: avatarUrl,
      avatar_url: avatarUrl,
      department: corporateDepartamento,
      icon: formData.icon,
      username: formData.username || generateUsername(formData.name) || formData.email.split('@')[0],
      bio: formData.bio,
      description: formData.bio,
      birthDate: formData.birthDate || corporateData?.birth_date || '',
      birthday: formData.birthDate || corporateData?.birth_date || '',
      admissionDate: corporateData?.hire_date || '',
      profession: corporateData?.cadeira_principal || corporateData?.profession || '',
      instagram: formData.instagram,
      linkedin: formData.linkedin,
      whatsapp: formData.whatsapp,
    }),
    [formData, avatarUrl, corporateDepartamento, corporateData]
  );

  return (
    <div className="space-y-6">
      <ProfileBanner userId={currentUser?.id ?? null} />

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 lg:gap-8 items-start">
        {/* Coluna esquerda: Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex justify-center lg:justify-start lg:sticky lg:top-24"
        >
          <ProfileCard
            enableTilt
            showUserInfo
            iconUrl="/assets/logo-gen-sem-fundo-svg.svg"
            userData={userDataForCard()}
          />
        </motion.div>

        {/* Coluna direita: Bigbox com tag buttons e conteúdo */}
        <div className="min-w-0 rounded-xl border border-border/70 bg-card/50 dark:bg-card/30 backdrop-blur-sm p-6 shadow-sm">
          <Tabs defaultValue="publico" className="w-full">
            <TabsList className="flex justify-start items-center gap-2 p-0 h-10 bg-transparent border-0 w-full mb-6">
              {[
                { value: 'publico', Icon: User, label: 'Público' },
                { value: 'corporativo', Icon: Building2, label: 'Corporativo' },
                { value: 'seguranca', Icon: Lock, label: 'Segurança' },
              ].map(({ value, Icon, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={cn(
                    'group flex items-center justify-center h-10 text-sm font-medium outline-none rounded-full shrink-0 select-none cursor-pointer',
                    'transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]',
                    // Estado Inativo: Círculo perfeito
                    'data-[state=inactive]:w-10 data-[state=inactive]:bg-muted/40 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/70',
                    // Estado Ativo: Pílula expandida
                    'data-[state=active]:w-auto data-[state=active]:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span
                    className={cn(
                      'overflow-hidden whitespace-nowrap text-sm transition-[max-width,opacity,margin] duration-300 ease-out',
                      'max-w-0 opacity-0 ml-0',
                      'group-data-[state=active]:max-w-[120px] group-data-[state=active]:opacity-100 group-data-[state=active]:ml-1.5'
                    )}
                  >
                    {label}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="publico" className="mt-0 outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-4 data-[state=active]:duration-700 ease-out">
              <ProfileInfoTab
                formData={formData}
                setFormData={setFormData}
                avatarUrl={avatarUrl}
                setAvatarUrl={setAvatarUrl}
                currentUserId={currentUser?.id ?? null}
                onUserUpdate={updateUser}
              />
            </TabsContent>
            <TabsContent value="corporativo" className="mt-0 outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-4 data-[state=active]:duration-700 ease-out">
              <ProfileCorporativoTab
                data={corporateData}
                loading={corporateLoading}
                notFound={corporateNotFound}
                departamento={corporateDepartamento}
                onRefresh={loadCorporate}
              />
            </TabsContent>
            <TabsContent value="seguranca" className="mt-0 outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-4 data-[state=active]:duration-700 ease-out">
              <ProfileSecurityTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
