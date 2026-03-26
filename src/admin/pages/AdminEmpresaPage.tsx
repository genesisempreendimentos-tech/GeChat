import { useEffect, useState } from 'react';
import { Building2, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { MainViewHeader } from '@/components/layout/header';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
import { EmpresaCompanyCard } from '@/components/empresa/EmpresaCompanyCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  getActiveWorkspacesWithIds,
  resolveGeTeamsWorkspaceId,
  type NeonWorkspaceOption,
} from '@/services/corporateProfile';
import { databaseService, type CompanyProfileApp } from '@/services/supabase';

const INITIAL_COMPANY_PROFILE: CompanyProfileApp = {
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

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium leading-none">
      {children}
    </label>
  );
}

function FieldTextarea({
  id,
  value,
  onChange,
  placeholder,
  className = '',
}: {
  id: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}

export default function AdminEmpresaPage() {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfileApp>(INITIAL_COMPANY_PROFILE);
  const [draft, setDraft] = useState<CompanyProfileApp>(INITIAL_COMPANY_PROFILE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [workspaceOptions, setWorkspaceOptions] = useState<NeonWorkspaceOption[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const openEditModal = () => {
    setDraft(companyProfile);
    setModalStep(1);
    setIsModalOpen(true);
  };

  const saveCompanyProfile = async () => {
    setSaving(true);
    try {
      let toSave = draft;
      if (draft.geTeamsWorkspace?.trim() && !String(draft.geTeamsWorkspaceId ?? '').trim()) {
        const resolved = (await resolveGeTeamsWorkspaceId(draft.geTeamsWorkspace)) ?? '';
        toSave = { ...draft, geTeamsWorkspaceId: resolved };
        setDraft(toSave);
      }
      const { error } = await databaseService.saveCompanyProfile(toSave);
      if (error) {
        console.error(error);
        toast.error('Erro ao salvar os dados da empresa.');
        return;
      }
      setCompanyProfile(toSave);
      setIsModalOpen(false);
      toast.success('Dados da empresa salvos com sucesso.');
    } catch (e) {
      console.error(e);
      toast.error('Erro inesperado ao salvar os dados da empresa.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const loadWorkspaces = async () => {
      setWorkspaceLoading(true);
      const list = await getActiveWorkspacesWithIds();
      setWorkspaceOptions(list);
      setWorkspaceLoading(false);
    };
    loadWorkspaces();
  }, []);

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
        if (data) {
          let geTeamsWorkspaceId = data.geTeamsWorkspaceId ?? '';
          if (data.geTeamsWorkspace?.trim() && !geTeamsWorkspaceId.trim()) {
            geTeamsWorkspaceId = (await resolveGeTeamsWorkspaceId(data.geTeamsWorkspace)) ?? '';
          }
          const merged = { ...data, geTeamsWorkspaceId };
          setCompanyProfile(merged);
          setDraft(merged);
        }
      } catch (e) {
        console.error(e);
        toast.error('Erro inesperado ao carregar os dados da empresa.');
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, []);

  const openDatePicker = (event: React.MouseEvent<HTMLInputElement>) => {
    const input = event.currentTarget as HTMLInputElement & { showPicker?: () => void };
    try {
      input.showPicker?.();
    } catch {
      // Alguns browsers bloqueiam showPicker quando não há gesto do utilizador.
      // Como o handler é do clique, a expectativa é que funcione; se não, cai no datepicker nativo.
    }
  };

  return (
    <MainViewFluidShell>
      <div className="space-y-6">
        <MainViewHeader
          icon={<Building2 className="h-6 w-6" />}
          title="Empresa"
          description="Gerencie as informações institucionais e configurações da empresa."
          button={
            <Button
              onClick={openEditModal}
              className="h-10 rounded-xl px-4 font-semibold shadow-sm shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/30"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar dados da empresa
            </Button>
          }
        />

        <EmpresaCompanyCard profile={companyProfile} />
      </div>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setModalStep(1);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar dados da empresa</DialogTitle>
            <DialogDescription>
              Atualize as informações da empresa. Esta tela já está pronta para integração futura com o Supabase.
            </DialogDescription>
          </DialogHeader>

          {modalStep === 1 ? (
            <div className="grid grid-cols-1 gap-4 py-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="name">Nome</FieldLabel>
                <Input
                  id="name"
                  value={draft.name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Nome da empresa"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="logo">Logo (URL)</FieldLabel>
                <Input
                  id="logo"
                  value={draft.logo}
                  onChange={(event) => setDraft((prev) => ({ ...prev, logo: event.target.value }))}
                  placeholder="https://empresa.com/logo.png"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="description">Descrição</FieldLabel>
                <FieldTextarea
                  id="description"
                  value={draft.description}
                  onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Descreva a empresa"
                  className="min-h-[120px]"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="segment">Segmento</FieldLabel>
                <Input
                  id="segment"
                  value={draft.segment}
                  onChange={(event) => setDraft((prev) => ({ ...prev, segment: event.target.value }))}
                  placeholder="Tecnologia"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="createdAt">Data de criação</FieldLabel>
                <Input
                  id="createdAt"
                  type="date"
                  value={draft.createdAt}
                  onChange={(event) => setDraft((prev) => ({ ...prev, createdAt: event.target.value }))}
                  onClick={openDatePicker}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="location">Localização</FieldLabel>
                <Input
                  id="location"
                  value={draft.location}
                  onChange={(event) => setDraft((prev) => ({ ...prev, location: event.target.value }))}
                  placeholder="Cidade - Estado"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="site">Site</FieldLabel>
                <Input
                  id="site"
                  value={draft.site}
                  onChange={(event) => setDraft((prev) => ({ ...prev, site: event.target.value }))}
                  placeholder="https://empresa.com"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="phone">Telefone</FieldLabel>
                <Input
                  id="phone"
                  value={draft.phone}
                  onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="email">E-mail</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={draft.email}
                  onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="contato@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="cnpj">CNPJ</FieldLabel>
                <Input
                  id="cnpj"
                  value={draft.cnpj}
                  onChange={(event) => setDraft((prev) => ({ ...prev, cnpj: event.target.value }))}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="geTeamsWorkspace">Workspace no GêTeams</FieldLabel>
                <Select
                  value={draft.geTeamsWorkspace}
                  onValueChange={(value) => {
                    const opt = workspaceOptions.find((w) => w.name === value);
                    setDraft((prev) => ({
                      ...prev,
                      geTeamsWorkspace: value,
                      geTeamsWorkspaceId: opt?.id?.trim() ?? prev.geTeamsWorkspaceId,
                    }));
                  }}
                >
                  <SelectTrigger id="geTeamsWorkspace">
                    <SelectValue
                      placeholder={workspaceLoading ? 'Carregando workspaces...' : 'Selecione um workspace ativo'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaceOptions.map((w) => (
                      <SelectItem key={w.id ? `${w.id}:${w.name}` : w.name} value={w.name}>
                        {w.name}
                      </SelectItem>
                    ))}
                    {!workspaceLoading && workspaceOptions.length === 0 ? (
                      <SelectItem value="__empty__" disabled>
                        Nenhum workspace ativo encontrado
                      </SelectItem>
                    ) : null}
                    {draft.geTeamsWorkspace &&
                    !workspaceOptions.some((w) => w.name === draft.geTeamsWorkspace) &&
                    draft.geTeamsWorkspace !== 'Não informado' ? (
                      <SelectItem value={draft.geTeamsWorkspace}>{draft.geTeamsWorkspace}</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="flex w-full items-center justify-between sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setModalStep(1)}
                disabled={modalStep === 1}
                aria-label="Voltar etapa"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setModalStep(2)}
                disabled={modalStep === 2}
                aria-label="Avançar etapa"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-teal-600 hover:bg-teal-700 text-white"
                onClick={saveCompanyProfile}
                disabled={saving}
              >
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainViewFluidShell>
  );
}
