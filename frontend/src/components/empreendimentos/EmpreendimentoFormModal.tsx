import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingGif } from '@/components/LoadingGif';
import {
  DEFAULT_EMPREENDIMENTO_COLOR,
  empreendimentoColorHex,
  normalizeEmpreendimentoColorToken,
  type EmpreendimentoColorToken,
} from '@/lib/brandColors';
import { cn } from '@/lib/utils';
import { EmpreendimentoAliasPickerDialog } from '@/components/empreendimentos/EmpreendimentoAliasPickerDialog';
import { EmpreendimentoColorPickerDialog } from '@/components/empreendimentos/EmpreendimentoColorPickerDialog';
import {
  createEmpreendimento,
  fetchAdminAliasClusters,
  fetchAdminEmpreendimentoDetail,
  updateEmpreendimento,
  uploadEmpreendimentoLogo,
} from '@/services/empreendimentosService';
import type { EmpreendimentoAlias, EmpreendimentoAliasCluster, EmpreendimentoGenesis } from '@/types/empreendimentos';

type EmpreendimentoFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: EmpreendimentoGenesis | null;
  onSaved: () => void;
};

function flattenAClassificar(clusters: EmpreendimentoAliasCluster[]): EmpreendimentoAlias[] {
  const map = new Map<number, EmpreendimentoAlias>();
  for (const cluster of clusters) {
    for (const alias of cluster.aliases) {
      if (alias.status === 'a_classificar') map.set(alias.id, alias);
    }
  }
  return [...map.values()].sort((a, b) => b.ocorrencias - a.ocorrencias);
}

function aliasLabel(alias: EmpreendimentoAlias) {
  const sample = alias.exemplos_crus?.[0];
  if (sample && sample.toLowerCase() !== alias.valor_norm) {
    return sample;
  }
  return alias.valor_norm;
}

export function EmpreendimentoFormModal({
  open,
  onOpenChange,
  editing,
  onSaved,
}: EmpreendimentoFormModalProps) {
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState<EmpreendimentoColorToken>(DEFAULT_EMPREENDIMENTO_COLOR);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [clusters, setClusters] = useState<EmpreendimentoAliasCluster[]>([]);
  const [mappedAliases, setMappedAliases] = useState<EmpreendimentoAlias[]>([]);
  const [selectedNewIds, setSelectedNewIds] = useState<Set<number>>(new Set());
  const [selectedMappedIds, setSelectedMappedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [aliasPickerOpen, setAliasPickerOpen] = useState(false);

  const aClassificar = useMemo(() => flattenAClassificar(clusters), [clusters]);

  const pickerAliases = useMemo(() => {
    const map = new Map<number, EmpreendimentoAlias>();
    for (const alias of aClassificar) map.set(alias.id, alias);
    for (const alias of mappedAliases) map.set(alias.id, alias);
    return [...map.values()].sort((a, b) => b.ocorrencias - a.ocorrencias);
  }, [aClassificar, mappedAliases]);

  const aliasById = useMemo(() => {
    const map = new Map<number, EmpreendimentoAlias>();
    for (const alias of aClassificar) map.set(alias.id, alias);
    for (const alias of mappedAliases) map.set(alias.id, alias);
    return map;
  }, [aClassificar, mappedAliases]);

  const selectedBadges = useMemo(() => {
    const ids = new Set([...selectedNewIds, ...selectedMappedIds]);
    return [...ids]
      .map((id) => aliasById.get(id))
      .filter((alias): alias is EmpreendimentoAlias => Boolean(alias));
  }, [selectedNewIds, selectedMappedIds, aliasById]);

  const loadModalData = useCallback(async () => {
    setLoading(true);
    setFormError('');
    const [{ data: clusterData, error: clusterError }, detailResult] = await Promise.all([
      fetchAdminAliasClusters('a_classificar'),
      editing ? fetchAdminEmpreendimentoDetail(editing.id) : Promise.resolve({ data: null, error: null }),
    ]);
    setLoading(false);
    if (clusterError) {
      setFormError(clusterError);
      return;
    }
    setClusters(clusterData?.clusters ?? []);

    if (editing && detailResult.data) {
      setNome(detailResult.data.nome);
      setCor(normalizeEmpreendimentoColorToken(detailResult.data.cor));
      setLogoUrl(detailResult.data.logo_url ?? '');
      setMappedAliases(detailResult.data.aliases ?? []);
      setSelectedMappedIds(new Set((detailResult.data.aliases ?? []).map((a) => a.id)));
      setSelectedNewIds(new Set());
    } else {
      setNome('');
      setCor(DEFAULT_EMPREENDIMENTO_COLOR);
      setLogoUrl('');
      setMappedAliases([]);
      setSelectedMappedIds(new Set());
      setSelectedNewIds(new Set());
    }
  }, [editing]);

  useEffect(() => {
    if (open) void loadModalData();
  }, [open, loadModalData]);

  const handleLogoChange = async (file: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setFormError('Imagem deve ter no máximo 2 MB.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setFormError('Selecione um arquivo de imagem válido.');
      return;
    }
    setLogoUploading(true);
    setFormError('');
    const { url, error } = await uploadEmpreendimentoLogo(file);
    setLogoUploading(false);
    if (error || !url) {
      setFormError(error ?? 'Falha no upload do logo.');
      return;
    }
    setLogoUrl(url);
  };

  const removeBadge = (aliasId: number) => {
    setSelectedNewIds((prev) => {
      const next = new Set(prev);
      next.delete(aliasId);
      return next;
    });
    setSelectedMappedIds((prev) => {
      const next = new Set(prev);
      next.delete(aliasId);
      return next;
    });
  };

  const handleAliasPickerSave = (ids: Set<number>) => {
    const mappedIds = new Set(mappedAliases.map((a) => a.id));
    const nextNew = new Set<number>();
    const nextMapped = new Set<number>();

    for (const id of ids) {
      if (mappedIds.has(id)) nextMapped.add(id);
      else nextNew.add(id);
    }

    setSelectedNewIds(nextNew);
    setSelectedMappedIds(nextMapped);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      setFormError('O nome do empreendimento é obrigatório.');
      return;
    }

    const aliasIds = [...selectedNewIds];
    const removeAliasIds = mappedAliases
      .map((a) => a.id)
      .filter((id) => !selectedMappedIds.has(id));

    setFormLoading(true);
    setFormError('');

    const payload = {
      nome: nome.trim(),
      cor,
      logo_url: logoUrl.trim() || null,
      alias_ids: aliasIds,
      remove_alias_ids: removeAliasIds,
    };

    const result = editing
      ? await updateEmpreendimento(editing.id, payload)
      : await createEmpreendimento(payload);

    setFormLoading(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    onOpenChange(false);
    onSaved();
  };

  const colorHex = empreendimentoColorHex(cor);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar empreendimento' : 'Adicionar empreendimento'}
            </DialogTitle>
            <DialogDescription>
              Defina o nome canônico, a cor de marca, a logo e os registros que serão agrupados.
            </DialogDescription>
          </DialogHeader>

          {formError ? (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          ) : null}

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingGif size="lg" />
            </div>
          ) : (
            <div className="space-y-6 py-1">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nome do empreendimento</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex.: Flow Genesis"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setColorPickerOpen(true)}
                    className={cn(
                      'h-10 w-10 shrink-0 rounded-lg border border-border bg-muted/30',
                      'flex items-center justify-center transition-colors hover:bg-muted/60',
                    )}
                    aria-label="Selecionar cor"
                  >
                    <span
                      className="h-6 w-6 rounded-full border border-black/10 shadow-sm"
                      style={{ backgroundColor: colorHex }}
                    />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Logo do empreendimento</label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => void handleLogoChange(e.target.files?.[0] ?? null)}
                    />
                    <Button type="button" variant="outline" disabled={logoUploading} asChild>
                      <span>
                        {logoUploading ? (
                          <LoadingGif size="sm" className="mr-2" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        Enviar logo
                      </span>
                    </Button>
                  </label>
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="h-12 w-12 rounded-lg border object-cover bg-background"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg border flex items-center justify-center bg-muted/40">
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Armazenado via API · bucket GeImage / empreendimentos
                </p>
              </div>

              <div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setAliasPickerOpen(true)}
                >
                  Selecionar empreendimentos
                </Button>
                {selectedBadges.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedBadges.map((alias) => (
                      <Badge
                        key={alias.id}
                        variant="secondary"
                        className="pl-2.5 pr-1 py-1 gap-1 rounded-lg max-w-full"
                      >
                        <span className="truncate">{aliasLabel(alias)}</span>
                        <button
                          type="button"
                          className="rounded-md p-0.5 hover:bg-muted"
                          onClick={() => removeBadge(alias.id)}
                          aria-label={`Remover ${aliasLabel(alias)}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <DialogFooter className="flex-row justify-between sm:justify-between gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={formLoading || loading}
            >
              {formLoading && <LoadingGif size="sm" className="mr-2" />}
              {editing ? 'Salvar alterações' : 'Criar empreendimento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmpreendimentoColorPickerDialog
        open={colorPickerOpen}
        onOpenChange={setColorPickerOpen}
        value={cor}
        onSelect={setCor}
      />

      <EmpreendimentoAliasPickerDialog
        open={aliasPickerOpen}
        onOpenChange={setAliasPickerOpen}
        aliases={pickerAliases}
        clusters={clusters}
        selectedIds={new Set([...selectedNewIds, ...selectedMappedIds])}
        onSave={handleAliasPickerSave}
      />
    </>
  );
}
