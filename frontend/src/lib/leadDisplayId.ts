/** Extrai número sequencial do id interno legado (`lead-001`, `lead-gen-42`). */
export function parseLeadSequentialNumber(id: string | null | undefined): number {
  const match = String(id ?? '').match(/(?:lead-gen-|lead-)(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

const GELEADS_ID_PATTERN = /^[A-Z]+\d{4}$/i;

/** ID persistido em all_leads_unique.geleads_id (A0001, B0001, AA0001, …). */
export function isGeleadsId(value: string | null | undefined): boolean {
  return GELEADS_ID_PATTERN.test(String(value ?? '').trim());
}

/** Extrai seq do geleads_id para ordenação (espelha backend encodeGeleadsId). */
export function parseGeleadsIdSeq(code: string | null | undefined): number | null {
  const raw = String(code ?? '').trim().toUpperCase();
  const match = raw.match(/^([A-Z]+)(\d{4})$/);
  if (!match) return null;
  const prefix = match[1];
  const numero = Number.parseInt(match[2], 10);
  if (numero < 1 || numero > 9999) return null;
  let letterIndex = 0;
  for (let i = 0; i < prefix.length; i += 1) {
    letterIndex = letterIndex * 26 + (prefix.charCodeAt(i) - 64);
  }
  letterIndex -= 1;
  return letterIndex * 9999 + numero;
}

/** @deprecated use parseGeleadsIdSeq — legado A0000 apenas */
export function parseLeadCodigoNumber(codigo: string | null | undefined): number | null {
  return parseGeleadsIdSeq(codigo);
}

/** ID amigável legado para vitrine mock (A0000, A0001, …). */
export function formatLeadDisplayId(seq: number): string {
  if (seq <= 0) return 'A0000';
  return `A${String(seq).padStart(4, '0')}`;
}

export type LeadDisplayIdRow = {
  id?: string | null;
  codigo?: string | null;
  geleads_id?: string | null;
};

export function getLeadDisplayId(row: LeadDisplayIdRow): string {
  const fromGeleads = String(row.geleads_id ?? '').trim();
  if (isGeleadsId(fromGeleads)) return fromGeleads.toUpperCase();

  const fromDb = String(row.codigo ?? '').trim();
  if (isGeleadsId(fromDb)) return fromDb.toUpperCase();

  return formatLeadDisplayId(parseLeadSequentialNumber(row.id));
}

export function compareLeadCodigo(a: LeadDisplayIdRow, b: LeadDisplayIdRow): number {
  const an = parseGeleadsIdSeq(getLeadDisplayId(a));
  const bn = parseGeleadsIdSeq(getLeadDisplayId(b));
  if (an != null && bn != null) return an - bn;
  if (an != null) return -1;
  if (bn != null) return 1;
  return parseLeadSequentialNumber(a.id) - parseLeadSequentialNumber(b.id);
}
