import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  FolderOpen,
  Layers,
  LayoutGrid,
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

const RH_MESSAGE =
  'Essas informações serão adicionadas pelo setor de RH. Qualquer dúvida, entrar em contato com rh@genesisempreendimentos.com.br';

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Dados corporativos
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                      aria-label="Informações sobre dados corporativos"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs font-extralight">
                    Essas informações serão adicionadas pelo setor de RH. <br /> Qualquer dúvida, entrar em contato com{' '}
                    <a href="mailto:rh@genesisempreendimentos.com.br" className="text-primary underline underline-offset-2 hover:opacity-80 cursor-pointer font-normal">rh@genesisempreendimentos.com.br</a>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </div>
            {onRefresh && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onRefresh}
                disabled={loading}
                className="shrink-0"
                aria-label="Atualizar dados corporativos"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                  <div className="h-10 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          )}
          {!loading && notFound && (
            <p className="text-muted-foreground text-sm mb-4">
              {RH_MESSAGE}
            </p>
          )}
          {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Nome; Telefone */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Nome
              </label>
              <Input
                value={formData.name}
                disabled
                readOnly
                className={readOnlyInputClass}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Telefone
              </label>
              <Input
                value={formData.phone}
                disabled
                readOnly
                className={readOnlyInputClass}
                placeholder="(00) 00000-0000"
              />
            </div>
            {/* 2. Email; Email corporativo */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Pessoal
              </label>
              <Input
                type="email"
                value={formData.personal_email ?? formData.email ?? ''}
                disabled
                readOnly
                className={readOnlyInputClass}
                placeholder="e-mail@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email corporativo
              </label>
              <Input
                type="email"
                value={formData.corporate_email ?? ''}
                disabled
                readOnly
                className={readOnlyInputClass}
                placeholder="email@empresa.com"
              />
            </div>
            {/* 3. Data de nascimento; CPF */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data de nascimento
              </label>
              <Input
                type="date"
                value={formData.birth_date}
                disabled
                readOnly
                className={readOnlyInputClass}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                CPF
              </label>
              <Input
                value={formData.cpf}
                disabled
                readOnly
                className={readOnlyInputClass}
                placeholder="000.000.000-00"
              />
            </div>
            {/* 4. Estado civil; Gênero */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Estado civil
              </label>
              <Input
                value={formData.marital_status}
                disabled
                readOnly
                className={readOnlyInputClass}
                placeholder="Ex.: Solteiro(a), Casado(a), Divorciado(a)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <CircleUser className="w-4 h-4" />
                Gênero
              </label>
              <Input
                value={formData.gender}
                disabled
                readOnly
                className={readOnlyInputClass}
                placeholder="Ex.: Masculino, Feminino, Outro"
              />
            </div>
            {/* 5. Profissão; Currículo */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Profissão
              </label>
              <Input
                value={formData.profession}
                disabled
                readOnly
                className={readOnlyInputClass}
                placeholder="Profissão"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Currículo
              </label>
              <ReadOnlyUrlField value={formData.curriculum_url} placeholder="URL do currículo" />
            </div>
            {/* 6. Endereço (largura total) */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Endereço
              </label>
              <Input
                value={formData.address}
                disabled
                readOnly
                className={readOnlyInputClass}
                placeholder="Rua, número, bairro, cidade, estado, CEP"
              />
            </div>
            {/* 7. Departamento; Setor */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Departamento
              </label>
              <Input
                value={departamentoValue ?? ''}
                disabled
                readOnly
                className={readOnlyInputClass}
                placeholder="Departamento"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Setor
              </label>
              <Input
                value={formData.setor ?? ''}
                disabled
                readOnly
                className={readOnlyInputClass}
                placeholder="Setor"
              />
            </div>
            {/* 8. Cadeira principal; Cadeira secundária */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Armchair className="w-4 h-4" />
                Cadeira principal
              </label>
              <Input
                value={formData.cadeira_principal ?? formData.primary_chair_id ?? ''}
                disabled
                readOnly
                className={readOnlyInputClass}
                placeholder="Nome da cadeira principal"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                Cadeira secundária
              </label>
              <Input
                value={formData.cadeiras_secundarias ?? ''}
                disabled
                readOnly
                className={readOnlyInputClass}
                placeholder="Nomes das cadeiras secundárias"
              />
            </div>
            {/* 9. Data de admissão; Contrato */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarCheck className="w-4 h-4" />
                Data de admissão
              </label>
              <Input
                type="date"
                value={formData.hire_date}
                disabled
                readOnly
                className={readOnlyInputClass}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FileSignature className="w-4 h-4" />
                Contrato
              </label>
              <ReadOnlyUrlField value={formData.contract_url} placeholder="URL do contrato" />
            </div>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
