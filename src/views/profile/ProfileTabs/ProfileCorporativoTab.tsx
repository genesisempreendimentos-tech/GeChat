import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Building2,
  User,
  Mail,
  Phone,
  CreditCard,
  Calendar,
  Briefcase,
  CircleUser,
  MapPin,
  CalendarCheck,
  Heart,
  FileText,
  FileSignature,
  Armchair,
  Grid2x2,
  Shapes,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface CorporativoFormData {
  name: string;
  personal_email: string;
  corporate_email: string;
  phone: string;
  cpf: string;
  birth_date: string;
  avatar_url: string;
  profession: string;
  gender: string;
  address: string;
  hire_date: string;
  dismissal_date: string;
  marital_status: string;
  curriculum_url: string;
  contract_url: string;
  departamento: string;
  setor: string;
  cadeira_principal: string;
  cadeiras_secundarias: string;
  primary_chair_id: string;
  email?: string;
}

const initialCorporativoData: CorporativoFormData = {
  name: '',
  personal_email: '',
  corporate_email: '',
  phone: '',
  cpf: '',
  birth_date: '',
  avatar_url: '',
  profession: '',
  gender: '',
  address: '',
  hire_date: '',
  dismissal_date: '',
  marital_status: '',
  curriculum_url: '',
  contract_url: '',
  departamento: '',
  setor: '',
  cadeira_principal: '',
  cadeiras_secundarias: '',
  primary_chair_id: '',
};

const readOnlyInputClass = 'bg-muted cursor-not-allowed opacity-90';

/** Aparência de input readonly, para usar como container de link clicável */
const readOnlyLinkContainerClass =
  'flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm opacity-90 items-center';

function isUrl(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const t = value.trim();
  return t.startsWith('http://') || t.startsWith('https://');
}

function ReadOnlyUrlField({
  value,
  placeholder,
}: {
  value: string;
  placeholder: string;
}) {
  const trimmed = (value || '').trim();
  if (isUrl(trimmed)) {
    return (
      <div className={readOnlyLinkContainerClass}>
        <a
          href={trimmed}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 truncate hover:opacity-80 cursor-pointer"
        >
          {trimmed}
        </a>
      </div>
    );
  }
  return (
    <Input
      value={value}
      disabled
      readOnly
      className={readOnlyInputClass}
      placeholder={placeholder}
    />
  );
}

interface ProfileCorporativoTabProps {
  data?: CorporativoFormData | null;
  loading?: boolean;
  notFound?: boolean;
  departamento?: string;
  onRefresh?: () => void;
}

export function ProfileCorporativoTab({
  data,
  loading = false,
  notFound = false,
  departamento,
  onRefresh,
}: ProfileCorporativoTabProps = {}) {
  const formData = data ?? initialCorporativoData;
  const departamentoValue = departamento ?? formData.departamento;

  const FieldLabel = ({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color?: string }) => (
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
      <Icon className={`w-3.5 h-3.5 ${color ?? ''}`} />
      {label}
    </label>
  );

  const roClass = 'h-9 text-sm bg-muted/50 cursor-not-allowed opacity-80 border-border/40';

  return (
    <div className="space-y-5">
      {/* ── Seção: Dados pessoais ─────────────────────────────── */}
      <div className="rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/20 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-violet-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold">Dados pessoais</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Info RH">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="w-max text-xs">
                    Essas informações são adicionadas pelo <br /> departamento de RH. <br /> Qualquer dúvida, entrar em contato com<br />{' '}
                    <a href="mailto:rh@genesisempreendimentos.com.br" className="text-primary underline">rh@genesisempreendimentos.com.br</a>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground">Informações cadastradas pelo RH</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button type="button" variant="ghost" size="icon" onClick={onRefresh} disabled={loading} className="w-7 h-7" aria-label="Atualizar">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                  <div className="h-9 rounded-lg bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel icon={User} label="Nome completo" />
                <Input value={formData.name} disabled readOnly className={roClass} placeholder="Nome completo" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel icon={Phone} label="Telefone" />
                <Input value={formData.phone} disabled readOnly className={roClass} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel icon={Mail} label="E-mail pessoal" />
                <Input type="email" value={formData.personal_email ?? formData.email ?? ''} disabled readOnly className={roClass} placeholder="e-mail@exemplo.com" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel icon={Mail} label="E-mail corporativo" />
                <Input type="email" value={formData.corporate_email ?? ''} disabled readOnly className={roClass} placeholder="email@empresa.com" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel icon={Calendar} label="Data de nascimento" />
                <Input type="date" value={formData.birth_date} disabled readOnly className={roClass} />
              </div>
              <div className="space-y-1.5">
                <FieldLabel icon={CreditCard} label="CPF" />
                <Input value={formData.cpf} disabled readOnly className={roClass} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel icon={Heart} label="Estado civil" />
                <Input value={formData.marital_status} disabled readOnly className={roClass} placeholder="Ex.: Solteiro(a)" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel icon={CircleUser} label="Gênero" />
                <Input value={formData.gender} disabled readOnly className={roClass} placeholder="Ex.: Masculino, Feminino" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel icon={Briefcase} label="Profissão" />
                <Input value={formData.profession} disabled readOnly className={roClass} placeholder="Profissão" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel icon={FileText} label="Currículo" />
                <ReadOnlyUrlField value={formData.curriculum_url} placeholder="URL do currículo" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <FieldLabel icon={MapPin} label="Endereço" />
                <Input value={formData.address} disabled readOnly className={roClass} placeholder="Rua, Número, Complemento, Bairro, Cidade - Estado, CEP, País" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Seção: Dados organizacionais ─────────────────────── */}
      {!loading && (
        <div className="rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/20 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50 bg-muted/20">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-teal-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">Dados organizacionais</p>
              <p className="text-xs text-muted-foreground">Estrutura e vínculo na empresa</p>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel icon={Grid2x2} label="Departamento" />
                <Input value={departamentoValue ?? ''} disabled readOnly className={roClass} placeholder="Departamento" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel icon={Shapes} label="Setor" />
                <Input value={formData.setor ?? ''} disabled readOnly className={roClass} placeholder="Setor" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel icon={Armchair} label="Cadeira principal" />
                <Input value={formData.cadeira_principal ?? formData.primary_chair_id ?? ''} disabled readOnly className={roClass} placeholder="Cadeira principal" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel icon={Armchair} label="Cadeiras secundárias" />
                <Input value={formData.cadeiras_secundarias ?? ''} disabled readOnly className={roClass} placeholder="Outros cargos" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel icon={CalendarCheck} label="Data de admissão" />
                <Input type="date" value={formData.hire_date} disabled readOnly className={roClass} />
              </div>
              <div className="space-y-1.5">
                <FieldLabel icon={FileSignature} label="Contrato" />
                <ReadOnlyUrlField value={formData.contract_url} placeholder="URL do contrato" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
