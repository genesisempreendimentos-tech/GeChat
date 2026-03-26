import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { MainViewHeader } from '@/components/layout/header';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { EmpresaCompanyCard } from '@/components/empresa/EmpresaCompanyCard';
import { databaseService, type CompanyProfileApp } from '@/services/supabase';

const EMPTY_PROFILE: CompanyProfileApp = {
  name: '',
  logo: '',
  description: '',
  segment: '',
  createdAt: '',
  location: '',
  site: '',
  phone: '',
  email: '',
  cnpj: '',
  geTeamsWorkspace: '',
  geTeamsWorkspaceId: '',
};

export default function EmpresaPage() {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfileApp>(EMPTY_PROFILE);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        const { data, error } = await databaseService.getCompanyProfile();
        if (error) {
          console.error(error);
          toast.error('Erro ao carregar os dados da empresa.');
          return;
        }
        if (data) setCompanyProfile(data);
      } catch (e) {
        console.error(e);
        toast.error('Erro inesperado ao carregar os dados da empresa.');
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, []);

  return (
    <MainViewFluidShell>
      <div className="space-y-6">
        <MainViewHeader
          icon={<Building2 className="h-6 w-6" />}
          title="Empresa"
          description="Consulte as informações institucionais da empresa."
        />

        {profileLoading ? (
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <EmpresaCompanyCard profile={companyProfile} showGeTeamsWorkspace={false} />
        )}
      </div>
    </MainViewFluidShell>
  );
}
