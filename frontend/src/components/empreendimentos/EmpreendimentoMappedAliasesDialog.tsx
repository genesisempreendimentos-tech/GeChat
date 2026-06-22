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
import { LoadingGifScreen } from '@/components/LoadingGif';
import { formatEmpreendimentoCount } from '@/components/empreendimentos/EmpreendimentoGenesisCard';
import { fetchEmpreendimentoMappedAliases } from '@/services/empreendimentosService';
import type { EmpreendimentoAlias, EmpreendimentoGenesis } from '@/types/empreendimentos';

type EmpreendimentoMappedAliasesDialogProps = {
  empreendimento: EmpreendimentoGenesis | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
};

function aliasLabel(alias: EmpreendimentoAlias) {
  const sample = alias.exemplos_crus?.[0];
  if (sample && sample.toLowerCase() !== alias.valor_norm) {
    return `${sample} (${alias.valor_norm})`;
  }
  return alias.valor_norm;
}

export function EmpreendimentoMappedAliasesDialog({
  empreendimento,
  open,
  onOpenChange,
  isAdmin = false,
}: EmpreendimentoMappedAliasesDialogProps) {
  const [aliases, setAliases] = useState<EmpreendimentoAlias[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open || !empreendimento) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSearch('');
    void fetchEmpreendimentoMappedAliases(empreendimento.id, isAdmin).then(
      ({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError(fetchError);
          setAliases([]);
        } else {
          setAliases(data?.aliases ?? []);
        }
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, empreendimento, isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return aliases;
    return aliases.filter(
      (alias) =>
        alias.valor_norm.includes(q) ||
        alias.exemplos_crus?.some((ex) => ex.toLowerCase().includes(q)),
    );
  }, [aliases, search]);

  const nome = empreendimento?.nome ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Aliases de {nome}</DialogTitle>
          <DialogDescription>
            Valores mapeados para este empreendimento (
            {formatEmpreendimentoCount(aliases.length)}{' '}
            {aliases.length === 1 ? 'alias' : 'aliases'}).
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Buscar alias..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="shrink-0"
        />

        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-muted/20">
          {loading ? (
            <LoadingGifScreen className="h-48" />
          ) : error ? (
            <p className="p-6 text-center text-sm text-destructive">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhum alias mapeado para este empreendimento.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((alias) => (
                <li
                  key={alias.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{aliasLabel(alias)}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatEmpreendimentoCount(alias.ocorrencias)} cadastros
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
