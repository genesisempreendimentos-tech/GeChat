import {
  Building,
  CalendarDays,
  Globe,
  Mail,
  MapPin,
  Phone,
  Tags,
  Landmark,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AdminBigBox } from '@/admin/components/AdminBigBox';
import type { CompanyProfileApp } from '@/services/supabase';

export function formatCompanyCreationDate(createdAt: string): string {
  if (!createdAt) return 'Não informado';
  const parsedDate = new Date(`${createdAt}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return 'Não informado';
  return parsedDate.toLocaleDateString('pt-BR');
}

function buildInfoItems(
  profile: CompanyProfileApp,
  showGeTeamsWorkspace: boolean,
): { label: string; value: string; icon: LucideIcon }[] {
  const formattedCreationDate = formatCompanyCreationDate(profile.createdAt);
  const base: { label: string; value: string; icon: LucideIcon }[] = [
    { label: 'Segmento', value: profile.segment, icon: Tags },
    { label: 'Data de criação', value: formattedCreationDate, icon: CalendarDays },
    { label: 'Localização', value: profile.location, icon: MapPin },
    { label: 'Site', value: profile.site, icon: Globe },
    { label: 'Telefone', value: profile.phone, icon: Phone },
    { label: 'E-mail', value: profile.email, icon: Mail },
    { label: 'CNPJ', value: profile.cnpj, icon: Landmark },
  ];
  if (!showGeTeamsWorkspace) return base;
  return [
    ...base,
    {
      label: 'Workspace no GêTeams',
      value: (() => {
        const n = profile.geTeamsWorkspace?.trim() ?? '';
        const id = profile.geTeamsWorkspaceId?.trim() ?? '';
        if (!n && !id) return '';
        if (n && id) return `${n} (${id})`;
        return n || id;
      })(),
      icon: Users,
    },
  ];
}

export function EmpresaCompanyCard({
  profile,
  /** Só no painel admin; no app do utilizador fica oculto. */
  showGeTeamsWorkspace = true,
}: {
  profile: CompanyProfileApp;
  showGeTeamsWorkspace?: boolean;
}) {
  const infoItems = buildInfoItems(profile, showGeTeamsWorkspace);

  return (
    <AdminBigBox>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-muted/40">
            {profile.logo ? (
              <img src={profile.logo} alt="Logo da empresa" className="h-full w-full object-cover" />
            ) : (
              <Building className="h-10 w-10 text-muted-foreground/60" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="text-lg font-semibold">{profile.name || 'Dados da empresa'}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {profile.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {infoItems.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl border border-border/70 bg-muted/20 p-3 transition-colors hover:bg-muted/35"
            >
              <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
              <p className="text-sm font-medium break-words">{value || 'Não informado'}</p>
            </div>
          ))}
        </div>
      </div>
    </AdminBigBox>
  );
}
