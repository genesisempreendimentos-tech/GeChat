/** Extrai número sequencial do id interno legado (`lead-001`, `lead-gen-42`). */
export function parseLeadSequentialNumber(id: string | null | undefined): number {
  const match = String(id ?? '').match(/(?:lead-gen-|lead-)(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

/** Extrai número de um codigo persistido (`A0000`, `A0001`, …). */
export function parseLeadCodigoNumber(codigo: string | null | undefined): number | null {
  const match = String(codigo ?? '').trim().match(/^A(\d+)$/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

/** ID amigável para exibição: A0000, A0001, … */
export function formatLeadDisplayId(seq: number): string {
  if (seq <= 0) return 'A0000';
  return `A${String(seq).padStart(4, '0')}`;
}

export type LeadDisplayIdRow = {
  id?: string | null;
  codigo?: string | null;
};

export function getLeadDisplayId(row: LeadDisplayIdRow): string {
  const fromDb = String(row.codigo ?? '').trim();
  if (/^A\d+$/i.test(fromDb)) return fromDb.toUpperCase();
  return formatLeadDisplayId(parseLeadSequentialNumber(row.id));
}

export function compareLeadCodigo(a: LeadDisplayIdRow, b: LeadDisplayIdRow): number {
  const an = parseLeadCodigoNumber(getLeadDisplayId(a));
  const bn = parseLeadCodigoNumber(getLeadDisplayId(b));
  if (an != null && bn != null) return an - bn;
  if (an != null) return -1;
  if (bn != null) return 1;
  return parseLeadSequentialNumber(a.id) - parseLeadSequentialNumber(b.id);
}
