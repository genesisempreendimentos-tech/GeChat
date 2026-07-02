/** Superfícies translúcidas (topbar, sidebars, painéis) — respeitam tokens light/dark/full-dark. */
export const GLASS_SHELL =
  'border-border/70 bg-card/55 backdrop-blur-xl';

export const GLASS_SHELL_BORDER_B = `${GLASS_SHELL} border-b`;
export const GLASS_SHELL_BORDER_R = `${GLASS_SHELL} border-r`;

/** Caixas grandes translúcidas (dashboards, listas). */
export const TRANSLUCENT_BIG_BOX =
  'min-h-[200px] rounded-lg border border-border/70 bg-card/30';

/** Painel admin — fundo mais sólido para leitura e contraste. */
export const ADMIN_PANEL_BOX =
  'min-h-[200px] rounded-xl border border-border/80 bg-card/95 backdrop-blur-md shadow-sm';

/** Card de entidade no admin (conversas, usuários). */
export const ADMIN_ENTITY_CARD =
  'rounded-xl border border-border/80 bg-background shadow-md transition-all duration-200 hover:shadow-lg hover:border-primary/30';
