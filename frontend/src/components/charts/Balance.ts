import type { GesiteBalancoMode } from '@/lib/gesiteControlLine';
import type { DateRange } from '@/lib/gesiteBalanco';

export type GesiteBalanceComparison = {
  mode: GesiteBalancoMode;
  current: DateRange;
  previous: DateRange;
};
