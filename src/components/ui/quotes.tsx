import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';

type QuoteRow = {
  frases?: string | null;
  frase?: string | null;
  autor?: string | null;
};

async function fetchRandomQuoteRow(): Promise<QuoteRow | null> {
  const { count, error: countError } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true });

  if (countError || count === null || count === 0) return null;

  const idx = Math.floor(Math.random() * count);
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: true })
    .range(idx, idx)
    .maybeSingle();

  if (error || !data) return null;
  return data as QuoteRow;
}

type QuotesProps = {
  /** Quando fica `true` (ex.: menu aberto), busca uma linha aleatória de novo. */
  open: boolean;
};

/**
 * Citação vinda da tabela `quotes` (colunas `frases` ou legado `frase`, e `autor`).
 */
export function Quotes({ open }: QuotesProps) {
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

        const texto = (row.frases ?? row.frase ?? '').trim() || null;
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
  }, [open]);

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
