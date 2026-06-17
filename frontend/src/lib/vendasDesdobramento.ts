import colors from 'tailwindcss/colors';

/** Identificadores internos das roscas de desdobramento na tela de vendas (não exibidos na UI). */
export const VENDAS_DESDOBRAMENTO_SECTIONS = {
  RESERVAS: 'desdobramento-reservas',
  VENDAS: 'desdobramento-vendas',
  PERDAS: 'desdobramento-perdas',
} as const;

export type VendasDesdobramentoSectionId =
  (typeof VENDAS_DESDOBRAMENTO_SECTIONS)[keyof typeof VENDAS_DESDOBRAMENTO_SECTIONS];

export type VendasDesdobramentoViewMode = 'numeral' | 'financial';

export type VendasDonutTailwindColor = {
  className: string;
  fill: string;
};

function donutColor(className: string, fill: string): VendasDonutTailwindColor {
  return { className, fill };
}

/** Paleta Tailwind das roscas — um tom por fatia, sem repetir entre os três gráficos. */
export const VENDAS_DONUT_COLORS = {
  green500: donutColor('bg-green-500', colors.green[500]),
  blue500: donutColor('bg-blue-500', colors.blue[500]),
  pink500: donutColor('bg-pink-500', colors.pink[500]),
  teal600: donutColor('bg-teal-600', colors.teal[600]),
  sky500: donutColor('bg-sky-500', colors.sky[500]),
  red500: donutColor('bg-red-500', colors.red[500]),
  red600: donutColor('bg-red-600', colors.red[600]),
  cyan500: donutColor('bg-cyan-500', colors.cyan[500]),
} as const;
