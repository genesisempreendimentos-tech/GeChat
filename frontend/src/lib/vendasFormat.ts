const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const BRL_FULL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMBER = new Intl.NumberFormat('pt-BR');

/** Valor em BRL completo (tooltip, tabela). */
export function formatVendasBRL(value: number): string {
  return BRL_FULL.format(value);
}

/** Valor compacto para cards grandes (ex.: R$ 652M). */
export function formatVendasBRLShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    const scaled = value / 1_000_000_000;
    const digits = Math.abs(scaled) >= 100 ? 0 : 1;
    return `R$ ${scaled.toLocaleString('pt-BR', { maximumFractionDigits: digits })}B`;
  }
  if (abs >= 1_000_000) {
    const scaled = value / 1_000_000;
    const digits = Math.abs(scaled) >= 100 ? 0 : 1;
    return `R$ ${scaled.toLocaleString('pt-BR', { maximumFractionDigits: digits })}M`;
  }
  if (abs >= 1_000) {
    const scaled = value / 1_000;
    const digits = Math.abs(scaled) >= 100 ? 0 : 1;
    return `R$ ${scaled.toLocaleString('pt-BR', { maximumFractionDigits: digits })}K`;
  }
  return BRL.format(value);
}

/** Valor compacto para cards grandes (ex.: R$ 650,4 mi). */
export function formatVendasBRLCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `R$ ${(value / 1_000_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} bi`;
  }
  if (abs >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  }
  if (abs >= 1_000) {
    return `R$ ${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  }
  return BRL.format(value);
}

export function formatVendasCount(value: number): string {
  return NUMBER.format(value);
}

export function formatVendasPercent(part: number, total: number): string {
  if (total <= 0) return '0%';
  return `${((part / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}
