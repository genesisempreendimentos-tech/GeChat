/** ID amigável A0001 — mesma regra da Vitrine (leadDisplayId.ts). */

export function parseLeadSequentialNumber(id) {
  const match = String(id ?? '').match(/(?:lead-gen-|lead-)(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

export function parseLeadCodigoNumber(codigo) {
  const match = String(codigo ?? '').trim().match(/^A(\d+)$/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

export function formatLeadDisplayId(seq) {
  if (seq <= 0) return 'A0000';
  return `A${String(seq).padStart(4, '0')}`;
}

export function resolveIdAmigavel(personId, codigo) {
  const fromDb = String(codigo ?? '').trim();
  if (/^A\d+$/i.test(fromDb)) return fromDb.toUpperCase();
  return formatLeadDisplayId(parseLeadSequentialNumber(personId));
}
