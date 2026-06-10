import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Data e hora no padrão brasileiro: `06/10/2026 às 09:00`. */
export function formatLeadDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

/** Data compacta para colunas secundárias: `02 jun 2026 • 14:32`. */
export function formatLeadDateCreated(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, "dd MMM yyyy '•' HH:mm", { locale: ptBR });
}
