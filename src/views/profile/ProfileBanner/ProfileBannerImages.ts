/**
 * Lista de URLs de imagens para o banner do perfil.
 * Pode ser trocada por assets locais (ex: /public/banners/...).
 */
export const BANNER_CATEGORIES: Record<string, { label: string; images: string[] }> = {
  genesis: {
    label: 'Gênesis',
    images: [
      'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200',
      'https://images.unsplash.com/photo-1557682250-702bd894d9f2?w=1200',
      'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=1200',
    ],
  },
  nature: {
    label: 'Natureza',
    images: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200',
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200',
    ],
  },
  urban: {
    label: 'Urbano',
    images: [
      'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200',
      'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1200',
      'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200',
    ],
  },
};

export const BANNER_ORDER = Object.keys(BANNER_CATEGORIES);

/** Todas as URLs em um array plano para escolha aleatória */
export function getAllBannerImages(): string[] {
  return BANNER_ORDER.flatMap((key) => BANNER_CATEGORIES[key]?.images ?? []);
}
