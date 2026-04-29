/**
 * Catálogo de banners locais organizados por categoria.
 * Todos os arquivos vivem em /public/assets/banners/<categoria>/
 */

export interface BannerCategory {
  label: string;
  icon: string; // nome do ícone lucide a usar no picker
  images: string[];
}

export const BANNER_CATEGORIES: Record<string, BannerCategory> = {
  demo: {
    label: 'Demo',
    icon: 'Home',
    images: [
      '/assets/banners/demo/1.jpg',
      '/assets/banners/demo/2.jpg',
      '/assets/banners/demo/3.jpg',
      '/assets/banners/demo/4.jpg',
      '/assets/banners/demo/5.jpg',
      '/assets/banners/demo/6.jpg',
      '/assets/banners/demo/7.jpg',
      '/assets/banners/demo/8.jpg',
      '/assets/banners/demo/9.jpg',
    ],
  },
  universo: {
    label: 'Universo',
    icon: 'Telescope', // mapeado para Star no picker
    images: [
      '/assets/banners/universo/anel_roxo.jpg',
      '/assets/banners/universo/astronauta.jpg',
      '/assets/banners/universo/cometa.jpg',
      '/assets/banners/universo/explosao.jpg',
      '/assets/banners/universo/galaxia.jpg',
      '/assets/banners/universo/pink_sky.jpg',
      '/assets/banners/universo/saturno.jpg',
      '/assets/banners/universo/supernova.jpg',
      '/assets/banners/universo/terra.jpg',
    ],
  },
  urbano: {
    label: 'Urbano',
    icon: 'Building2',
    images: [
      '/assets/banners/urbano/arranha_ceu.jpg',
      '/assets/banners/urbano/aviao.jpg',
      '/assets/banners/urbano/city_mar.jpg',
      '/assets/banners/urbano/future.jpg',
      '/assets/banners/urbano/pink_city.jpg',
      '/assets/banners/urbano/rota66.jpg',
      '/assets/banners/urbano/simcity.jpg',
      '/assets/banners/urbano/skybuild.jpg',
      '/assets/banners/urbano/textura_predio.jpg',
    ],
  },
  cidades: {
    label: 'Cidades',
    icon: 'Map',
    images: [
      '/assets/banners/cidades/BR _ Belo Horizonte 1.jpg',
      '/assets/banners/cidades/BR _ Belo Horizonte 2.jpg',
      '/assets/banners/cidades/BR _ Curitiba.jpg',
      '/assets/banners/cidades/BR _ Rio de Janeiro - Lapa.jpg',
      '/assets/banners/cidades/BR _ Rio de Janeiro 2.jpg',
      '/assets/banners/cidades/BR _ Rio de Janeiro.jpg',
      '/assets/banners/cidades/BR _ Salvador.jpg',
      '/assets/banners/cidades/CH _ Santiago.jpg',
      '/assets/banners/cidades/CN _ Shanghai.jpg',
      '/assets/banners/cidades/CN _ Templo.jpg',
      '/assets/banners/cidades/DN _Copenhague.jpg',
      '/assets/banners/cidades/EAU _ Dubai.jpg',
      '/assets/banners/cidades/EGT _ Giza.jpg',
      '/assets/banners/cidades/EUA _ Golden Gate.jpg',
      '/assets/banners/cidades/EUA _ Grand Canyon.jpg',
      '/assets/banners/cidades/EUA _ NY 1.jpg',
      '/assets/banners/cidades/EUA _ NY 2.jpg',
      '/assets/banners/cidades/EUA _ Utah.jpg',
      '/assets/banners/cidades/FR _ Paris 2.jpg',
      '/assets/banners/cidades/FR _ Paris 3.jpg',
      '/assets/banners/cidades/FR _ Paris 4.jpg',
      '/assets/banners/cidades/IND _ Taj Mahal.jpg',
      '/assets/banners/cidades/IT _ Veneza.jpg',
      '/assets/banners/cidades/JP _ Fuji.jpg',
      '/assets/banners/cidades/JP _ Shibuya.jpg',
      '/assets/banners/cidades/Prancheta 9.jpg',
      '/assets/banners/cidades/PT _ Lisboa.jpg',
      '/assets/banners/cidades/UK _ Londres.jpg',
    ],
  },
  arte: {
    label: 'Arte',
    icon: 'Palette',
    images: [
      '/assets/banners/arte/Colville.jpg',
      '/assets/banners/arte/Dali.jpg',
      '/assets/banners/arte/Hokussai.jpg',
      '/assets/banners/arte/michelangelo.jpg',
      '/assets/banners/arte/Nam June Paik.jpg',
      '/assets/banners/arte/Picasso.jpg',
      '/assets/banners/arte/Rembrandt.jpg',
      '/assets/banners/arte/Tarsila.jpg',
      '/assets/banners/arte/Van Gogh.jpg',
    ],
  },
  abstrato: {
    label: 'Abstrato',
    icon: 'Shapes', // mapeado para Sparkles no picker
    images: [
      '/assets/banners/abstrato/apple.jpg',
      '/assets/banners/abstrato/atriom.jpg',
      '/assets/banners/abstrato/bola.jpg',
      '/assets/banners/abstrato/caixas.jpg',
      '/assets/banners/abstrato/flor.jpg',
      '/assets/banners/abstrato/onda_roxa.jpg',
      '/assets/banners/abstrato/pontilhismo.jpg',
      '/assets/banners/abstrato/queda.jpg',
      '/assets/banners/abstrato/reflexo.jpg',
    ],
  },
  hobbies: {
    label: 'Hobbies',
    icon: 'Gamepad2',
    images: [
      '/assets/banners/hobbies/culinaria.jpg',
      '/assets/banners/hobbies/fotografia.jpg',
      '/assets/banners/hobbies/Jiujitsu.jpg',
      '/assets/banners/hobbies/literatura.jpg',
      '/assets/banners/hobbies/muaythai.jpg',
      '/assets/banners/hobbies/Pintura.jpg',
      '/assets/banners/hobbies/skate.jpg',
      '/assets/banners/hobbies/violao.jpg',
      '/assets/banners/hobbies/Xadrez.jpg',
    ],
  },
  futebol: {
    label: 'Futebol',
    icon: 'Trophy',
    images: [
      '/assets/banners/futebol/atleticomg.jpg',
      '/assets/banners/futebol/bahia.jpg',
      '/assets/banners/futebol/botafogo.jpg',
      '/assets/banners/futebol/flamengo.jpg',
      '/assets/banners/futebol/fluminense.jpg',
      '/assets/banners/futebol/gremio.jpg',
      '/assets/banners/futebol/pameiras.jpg',
      '/assets/banners/futebol/spfc.jpg',
      '/assets/banners/futebol/vasco.jpg',
    ],
  },
};

export const BANNER_ORDER = Object.keys(BANNER_CATEGORIES);

/** Todas as URLs em um array plano para escolha aleatória */
export function getAllBannerImages(): string[] {
  return BANNER_ORDER.flatMap((key) => BANNER_CATEGORIES[key]?.images ?? []);
}
