import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';

type QuoteRow = {
  id?: string;
  frase?: string | null;
  autor?: string | null;
};

/** Índice uniforme em [0, n) — fallback quando a RPC `random_quote` não existir. */
function randomIndex(n: number): number {
  if (n <= 1) return 0;
  const max = 0x1_0000_0000;
  const limit = max - (max % n);
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % n;
}

async function fetchRandomQuoteRow(): Promise<QuoteRow | null> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('random_quote');

  if (!rpcError && rpcData) {
    const row = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as QuoteRow | undefined;
    if (row?.frase || row?.autor) return row;
  }

  const { data: idRows, error: idsError } = await supabase
    .from('quotes')
    .select('id')
    .order('id', { ascending: true });

  if (idsError || !idRows?.length) return null;

  const pick = idRows[randomIndex(idRows.length)] as { id: string };
  if (!pick?.id) return null;

  const { data, error } = await supabase.from('quotes').select('*').eq('id', pick.id).maybeSingle();

  if (error || !data) return null;
  return data as QuoteRow;
}

type QuotesProps = {
  /** Quando fica `true` (ex.: menu aberto), busca uma linha aleatória de novo. */
  open: boolean;
  /** Incrementa a cada abertura do menu para forçar nova citação. */
  fetchKey?: number;
};

/**
 * Citação vinda da tabela `quotes` (colunas `frase` e `autor`).
 */
export function Quotes({ open, fetchKey = 0 }: QuotesProps) {
  const [frase, setFrase] = useState<string | null>(null);
  const [autor, setAutor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const row = await fetchRandomQuoteRow();
        if (cancelled) return;

        if (!row) {
          setFrase(null);
          setAutor(null);
          return;
        }

        const texto = (row.frase ?? '').trim() || null;
        const autorVal = (row.autor ?? '').trim() || null;
        setFrase(texto);
        setAutor(autorVal);
      } catch {
        if (!cancelled) {
          setFrase(null);
          setAutor(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, fetchKey]);

  if (loading) {
    return (
      <div className="w-max max-w-full space-y-2 animate-pulse">
        <div className="h-4 w-48 max-w-full rounded-md bg-muted/60" />
        <div className="h-3 w-32 max-w-full rounded-md bg-muted/40" />
      </div>
    );
  }

  if (!frase && !autor) {
    return (
      <p className="w-max max-w-full text-sm text-muted-foreground leading-relaxed">
        Nenhuma citação disponível no momento.
      </p>
    );
  }

  return (
    <div className="w-max max-w-full space-y-2 text-left">
      {frase ? (
        <p className="text-sm font-medium leading-relaxed text-foreground [overflow-wrap:anywhere]">"{frase}"</p>
      ) : null}
      {autor ? (
        <p className="text-xs italic text-muted-foreground/80 leading-snug [overflow-wrap:anywhere]">— {autor}</p>
      ) : null}
    </div>
  );
}
