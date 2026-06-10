import type { LeadsBalancoMode } from '@/lib/leadsControlLine';
import type { DateRange } from '@/lib/leadsBalanco';

export type LeadsBalanceComparison = {
  mode: LeadsBalancoMode;
  current: DateRange;
  previous: DateRange;
};
