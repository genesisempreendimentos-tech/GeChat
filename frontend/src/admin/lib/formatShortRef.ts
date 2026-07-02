/** Referência curta e legível para IDs longos (ex.: `#1bbdb2ae`). */
export function formatShortRef(id: string): string {
  const compact = id.replace(/-/g, '').toLowerCase();
  if (!compact) return '—';
  return `#${compact.slice(0, 8)}`;
}
