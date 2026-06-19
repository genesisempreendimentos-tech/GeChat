import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { EmpreendimentoAlias, EmpreendimentoAliasCluster } from '@/types/empreendimentos';

type EmpreendimentoAliasPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aliases: EmpreendimentoAlias[];
  clusters: EmpreendimentoAliasCluster[];
  selectedIds: Set<number>;
  onSave: (ids: Set<number>) => void;
};

function aliasLabel(alias: EmpreendimentoAlias) {
  const sample = alias.exemplos_crus?.[0];
  if (sample && sample.toLowerCase() !== alias.valor_norm) {
    return `${sample} (${alias.valor_norm})`;
  }
  return alias.valor_norm;
}

function findClusterForAlias(clusters: EmpreendimentoAliasCluster[], aliasId: number) {
  return clusters.find((cluster) => cluster.aliases.some((alias) => alias.id === aliasId));
}

export function EmpreendimentoAliasPickerDialog({
  open,
  onOpenChange,
  aliases,
  clusters,
  selectedIds,
  onSave,
}: EmpreendimentoAliasPickerDialogProps) {
  const [draft, setDraft] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(new Set(selectedIds));
      setSearch('');
    }
  }, [open, selectedIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return aliases;
    return aliases.filter(
      (alias) =>
        alias.valor_norm.includes(q) ||
        alias.exemplos_crus?.some((ex) => ex.toLowerCase().includes(q)),
    );
  }, [aliases, search]);

  const toggle = (aliasId: number, checked: boolean) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (checked) {
        if (prev.size === 0) {
          const cluster = findClusterForAlias(clusters, aliasId);
          if (cluster) {
            for (const alias of cluster.aliases) {
              if (alias.status === 'a_classificar' || alias.status === 'nao_informado') {
                next.add(alias.id);
              }
            }
            return next;
          }
        }
        next.add(aliasId);
      } else {
        next.delete(aliasId);
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar empreendimentos</DialogTitle>
          <DialogDescription>
            Escolha os registros do banco para agrupar neste empreendimento canônico.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="shrink-0"
        />

        <div className="min-h-0 flex-1 overflow-y-auto space-y-2 border rounded-lg p-3 bg-muted/20">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum registro disponível.
            </p>
          ) : (
            filtered.map((alias) => (
              <label
                key={alias.id}
                className="flex items-start gap-2 text-sm cursor-pointer rounded-md px-1 py-1 hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={draft.has(alias.id)}
                  onChange={(e) => toggle(alias.id, e.target.checked)}
                />
                <span className="min-w-0">
                  <span className="font-medium">{aliasLabel(alias)}</span>
                  <span className="text-muted-foreground ml-2">({alias.ocorrencias} leads)</span>
                </span>
              </label>
            ))
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => { onSave(draft); onOpenChange(false); }}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
