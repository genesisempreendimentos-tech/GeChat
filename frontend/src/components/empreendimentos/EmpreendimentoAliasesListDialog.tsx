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
import { Badge } from '@/components/ui/badge';
import { LoadingGifScreen } from '@/components/LoadingGif';
import { formatEmpreendimentoCount } from '@/components/empreendimentos/EmpreendimentoGenesisCard';
import { fetchAdminAllAliases } from '@/services/empreendimentosService';
import type { EmpreendimentoAliasListItem } from '@/types/empreendimentos';
import { cn } from '@/lib/utils';

type EmpreendimentoAliasesListDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingCount: number;
};

function aliasLabel(alias: EmpreendimentoAliasListItem) {
  const sample = alias.exemplos_crus?.[0];
  if (sample && sample.toLowerCase() !== alias.valor_norm) {
    return `${sample} (${alias.valor_norm})`;
  }
  return alias.valor_norm;
}

function statusLabel(alias: EmpreendimentoAliasListItem) {
  if (alias.status === 'mapeado' && alias.empreendimento_nome) {
    return `Mapeado → ${alias.empreendimento_nome}`;
  }
  if (alias.status === 'mapeado') return 'Mapeado';
  if (alias.status === 'nao_informado') return 'Não informado';
  return 'A classificar';
}

function statusVariant(alias: EmpreendimentoAliasListItem): 'default' | 'secondary' | 'outline' {
  if (alias.status === 'mapeado') return 'default';
  if (alias.status === 'a_classificar') return 'secondary';
  return 'outline';
}

export function EmpreendimentoAliasesListDialog({
  open,
  onOpenChange,
  pendingCount,
}: EmpreendimentoAliasesListDialogProps) {
  const [aliases, setAliases] = useState<EmpreendimentoAliasListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSearch('');
    void fetchAdminAllAliases().then(({ data, error: fetchError }) => {
      if (cancelled) return;
      if (fetchError) {
        setError(fetchError);
        setAliases([]);
      } else {
        setAliases(data?.aliases ?? []);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return aliases;
    return aliases.filter(
      (alias) =>
        alias.valor_norm.includes(q) ||
        alias.exemplos_crus?.some((ex) => ex.toLowerCase().includes(q)) ||
        alias.empreendimento_nome?.toLowerCase().includes(q),
    );
  }, [aliases, search]);

  const title =
    pendingCount > 0
      ? `${pendingCount} alias(es) a classificar`
      : 'Todos os aliases cadastrados';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Registros distintos em <code className="text-xs">all_leads.empreendimento_interesse</code>{' '}
            ({formatEmpreendimentoCount(aliases.length)} no total).
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
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhum alias encontrado.</p>
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
                      {formatEmpreendimentoCount(alias.ocorrencias)} leads
                    </p>
                  </div>
                  <Badge variant={statusVariant(alias)} className={cn('shrink-0 rounded-md')}>
                    {statusLabel(alias)}
                  </Badge>
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
