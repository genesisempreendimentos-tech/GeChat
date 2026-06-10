/** Extrai número sequencial do id interno (`lead-001`, `lead-gen-42`). */
export function parseLeadSequentialNumber(id: string): number {
  const match = id.match(/(?:lead-gen-|lead-)(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

/** ID amigável para exibição: A0001, A0002, … */
export function formatLeadDisplayId(seq: number): string {
  if (seq <= 0) return 'A0000';
  return `A${String(seq).padStart(4, '0')}`;
}

export function getLeadDisplayId(row: { id: string }): string {
  return formatLeadDisplayId(parseLeadSequentialNumber(row.id));
}
