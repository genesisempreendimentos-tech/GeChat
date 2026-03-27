import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { ProfileActivitiesTab } from './ProfileTabs/ProfileActivitiesTab';
import { ProfileCorporativoTab } from './ProfileTabs/ProfileCorporativoTab';
import { User, Lock, Building2, Save, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingGif } from '@/components/LoadingGif';
import { cn } from '@/lib/utils';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { MainViewHeader } from '@/components/layout/header';
import { useSearchParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type MascoteOption = 'gato' | 'cachorro' | 'passaro' | 'terra' | 'tigre' | 'cavalo' | 'peixe' | 'leao' | '';

export interface ProfileFormData {
  name: string;
  email: string;
  apelido: string;
  username: string;
  bio: string;
  icon: string;
  mascote: MascoteOption;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const fromTour = searchParams.get('fromTour') === '1';
  const [tourWelcomeOpen, setTourWelcomeOpen] = useState(fromTour);
  const { user: currentUser, updateUser } = useAuthStore();
  const [formData, setFormData] = useState<ProfileFormData>({
    name: currentUser?.name ?? '',
    email: currentUser?.email ?? '',
    apelido: '',
    username: currentUser?.email?.split('@')[0] ?? '',
    bio: '',
    icon: '',
    mascote: '',
    linkedin: '',
    instagram: '',
    whatsapp: '',
  });
  const [initialFormData, setInitialFormData] = useState<ProfileFormData>({
    name: currentUser?.name ?? '',
    email: currentUser?.email ?? '',
    apelido: '',
    username: currentUser?.email?.split('@')[0] ?? '',
    bio: '',
    icon: '',
    mascote: '',
    linkedin: '',
    instagram: '',
    whatsapp: '',
  });
  const profileInfoTabRef = useRef<{ save: () => Promise<void> } | null>(null);
  const hasFormChanges = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialFormData),
    [formData, initialFormData]
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(
    currentUser?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.email ?? 'user'}`
  );
  const [bannerUrl, setBannerUrl] = useState<string>('');
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
        const payload: ProfileFormData = {
          name: (d.name as string) ?? currentUser?.name ?? '',
          email: (d.email as string) ?? currentUser?.email ?? '',
          apelido: getStr('apelido'),
          username: getStr('username') || (currentUser?.email?.split('@')[0] ?? ''),
          bio: getStr('bio'),
          icon: getStr('icon'),
          mascote: (getStr('mascote') as ProfileFormData['mascote']) || '',
          linkedin: getStr('linkedin'),
          instagram: getStr('instagram'),
          whatsapp: getStr('whatsapp'),
          phone: getStr('phone'),
          location: getStr('location'),
          jobTitle: (d.job_title as string) ?? '',
          birthDate: (d.birth_date as string) ?? '',
        };
        setFormData(payload);
        setInitialFormData(payload);
        if (d.avatar) setAvatarUrl(d.avatar as string);
        if (d.banner_url) setBannerUrl(d.banner_url as string);
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

  useEffect(() => {
    if (!fromTour) return;
    setTourWelcomeOpen(true);
  }, [fromTour]);

  const handleCloseTourWelcome = () => {
    setTourWelcomeOpen(false);
    const params = new URLSearchParams(searchParams);
    params.delete('fromTour');
    setSearchParams(params, { replace: true });
  };

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
      hire_date: corporateData?.hire_date || '',
      admissionDate: corporateData?.hire_date || '',
      profession: corporateData?.cadeira_principal || corporateData?.profession || '',
      sector_icon: corporateData?.sector_icon || '',
      mascote: formData.mascote,
      instagram: formData.instagram,
      linkedin: formData.linkedin,
      whatsapp: formData.whatsapp,
      banner_url: bannerUrl,
    }),
    [formData, avatarUrl, bannerUrl, corporateDepartamento, corporateData]
  );

  return (
    <MainViewFluidShell>
    <div className="space-y-6">
      <Dialog open={tourWelcomeOpen} onOpenChange={(open) => { if (!open) handleCloseTourWelcome(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bem-vindo ao GêApps!</DialogTitle>
            <DialogDescription className="pt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Esta e a intranet oficial da Genesis, criada para centralizar recursos, comunicações e acessos importantes do seu dia a dia.
              </p>
              <p>
                Para aproveitar melhor a plataforma, pedimos que você preencha suas informações públicas no perfil. Isso ajudará na sua identificação dentro do sistema e melhorará sua experiência de uso.
              </p>
              <p>Seja bem-vindo(a)!</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleCloseTourWelcome}>Entendi, vamos configurar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MainViewHeader
        icon={<User className="h-6 w-6" />}
        title="Perfil"
        description="Seus dados públicos, informações corporativas, atividades e segurança da conta."
      />
      <ProfileBanner
        userId={currentUser?.id ?? null}
        value={bannerUrl}
        onBannerChange={setBannerUrl}
      />

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
            currentUser={{ ...currentUser, apelido: formData.apelido, name: formData.name, username: formData.username }}
          />
        </motion.div>

        {/* Coluna direita: Bigbox com tag buttons e conteúdo */}
        <div className="min-w-0 rounded-xl border border-border/70 bg-card/50 dark:bg-card/30 backdrop-blur-sm p-6 shadow-sm">
          <Tabs defaultValue="publico" className="w-full">
            <div className="flex justify-between items-center gap-2 w-full mb-6">
              <TabsList className="flex justify-start items-center gap-2 p-0 h-10 bg-transparent border-0 flex-1 min-w-0">
                {[
                  { value: 'publico', Icon: User, label: 'Público' },
                  { value: 'corporativo', Icon: Building2, label: 'Corporativo' },
                  { value: 'atividades', Icon: Activity, label: 'Atividades' },
                  { value: 'seguranca', Icon: Lock, label: 'Segurança' },
                ].map(({ value, Icon, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className={cn(
                      'group flex items-center justify-center h-10 text-sm font-medium outline-none rounded-full shrink-0 select-none cursor-pointer',
                      'transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]',
                      'data-[state=inactive]:w-10 data-[state=inactive]:bg-muted/40 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/70',
                      'data-[state=active]:w-auto data-[state=active]:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span
                      className={cn(
                        'overflow-hidden whitespace-nowrap text-sm transition-[max-width,opacity,margin] duration-300 ease-out',
                        'max-w-0 opacity-0 ml-0',
                        'group-data-[state=active]:max-w-[140px] group-data-[state=active]:opacity-100 group-data-[state=active]:ml-1.5'
                      )}
                    >
                      {label}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
              {hasFormChanges && (
                <Button
                  onClick={() => profileInfoTabRef.current?.save()}
                  disabled={savingProfile}
                  className="gap-2 min-w-[140px] shrink-0"
                >
                  {savingProfile ? (
                    <><LoadingGif size="sm" className="inline-block w-4 h-4" /> Salvando...</>
                  ) : (
                    <><Save className="w-4 h-4" /> Salvar alterações</>
                  )}
                </Button>
              )}
            </div>

            <TabsContent value="publico" className="mt-0 outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-4 data-[state=active]:duration-700 ease-out">
              <ProfileInfoTab
                ref={profileInfoTabRef}
                formData={formData}
                setFormData={setFormData}
                avatarUrl={avatarUrl}
                setAvatarUrl={setAvatarUrl}
                currentUserId={currentUser?.id ?? null}
                onUserUpdate={updateUser}
                onSaveSuccess={() => setInitialFormData(formData)}
                onSavingChange={setSavingProfile}
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
            <TabsContent value="atividades" className="mt-0 outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-4 data-[state=active]:duration-700 ease-out">
              <ProfileActivitiesTab />
            </TabsContent>
            <TabsContent value="seguranca" className="mt-0 outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-4 data-[state=active]:duration-700 ease-out">
              <ProfileSecurityTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
    </MainViewFluidShell>
  );
}
