export type GesiteBalancoMode = 'desligado' | 'mes_anterior' | 'semana_anterior';

export type GesitePageControlFilters = {
  balanco: GesiteBalancoMode;
};

export function defaultGesitePageControlFilters(): GesitePageControlFilters {
  return { balanco: 'desligado' };
}
