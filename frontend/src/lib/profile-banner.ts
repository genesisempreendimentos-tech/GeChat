const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

function encodePathSegments(path: string) {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

/**
 * Extrai o caminho relativo dentro de `public/banners` a partir do valor salvo no Supabase.
 *
 * Formatos aceitos em `profiles.banner_url`:
 * - `/assets/banners/futebol/flamengo.jpg` (legado no banco)
 * - `/banners/futebol/flamengo.jpg`
 * - `futebol/flamengo.jpg`
 * - `banners/cidades/CN _ Shanghai.jpg`
 */
function normalizeBannerRelativePath(raw: string): string {
  let path = raw.trim().replace(/^\/+/, '');

  if (/^assets\/banners\//i.test(path)) {
    path = path.replace(/^assets\/banners\//i, '');
  } else if (/^banners\//i.test(path)) {
    path = path.replace(/^banners\//i, '');
  }

  if (!IMAGE_EXT.test(path)) {
    path = `${path}.jpg`;
  }

  return encodePathSegments(path);
}

export function resolveProfileBannerUrl(raw?: string | null): string | null {
  if (!raw) return null;

  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `/banners/${normalizeBannerRelativePath(trimmed)}`;
}
