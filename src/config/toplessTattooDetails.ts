const TOPLESS_BASE_FILE = '../CLOTHES/CLOTHES_Topless_.png';
const TATTOO_ASSET_VERSION = '20260305a';

export const TOPLESS_TATTOO_TRAIT_ID = 'Clothes_Topless';

export interface G2DetailOptionLike {
  file: string;
  name: string;
}

interface G2TraitLike {
  id: string;
  name: string;
  category: string;
  colorable: boolean;
  outlineFile?: string;
  detailOptions?: G2DetailOptionLike[];
}

interface G2CategoryLike {
  layerName: string;
  zIndex: number;
  description: string;
  traits: string[];
}

interface G2ManifestLike {
  version: number;
  collection: string;
  basePath: string;
  categories: Record<string, G2CategoryLike>;
  traits: G2TraitLike[];
}

const TOPLESS_TATTOO_FILES = [
  'tattoos_1_Taco.png',
  'tattoos_1_anchor-sailor.png',
  'tattoos_1_anchor.png',
  'tattoos_1_bad-tattoo.png',
  'tattoos_1_gengar.png',
  'tattoos_1_jesus.png',
  'tattoos_1_meme-cat-1.png',
  'tattoos_1_meme-cat-7.png',
  'tattoos_1_mom.png',
  'tattoos_1_orange.png',
  'tattoos_1_pikachu.png',
  'tattoos_1_skull-crown.png',
  'tattoos_1_skull-roses-2.png',
  'tattoos_1_skull-roses.png',
  'tattoos_2_ak47.png',
  'tattoos_2_crown.png',
  'tattoos_2_dragon.png',
  'tattoos_2_meme-cat-2.png',
  'tattoos_2_meme-cat-6.png',
  'tattoos_2_one-piece.png',
  'tattoos_2_orange-leaf.png',
  'tattoos_2_skull_cig.png',
  'tattoos_2_snake.png',
  'tattoos_2_thug-life.png',
  'tattoos_3_dragon.png',
  'tattoos_3_grenade.png',
  'tattoos_3_meme-cat-3.png',
  'tattoos_3_meme-cat-5.png',
  'tattoos_3_oranges.png',
  'tattoos_3_skull 2.png',
  'tattoos_3_skull-flames.png',
  'tattoos_3_turtle.png',
  'tattoos_4_$NECK.png',
  'tattoos_4_orange-font.png',
  'tattoos_4_sparrow.png',
] as const;

const UPPERCASE_TOKEN_OVERRIDES: Record<string, string> = {
  ak47: 'AK47',
  '$neck': '$NECK',
};

function formatTattooLabel(filename: string): string {
  const base = filename
    .replace(/^tattoos_\d+_/i, '')
    .replace(/\.(png|jpg|jpeg|webp)$/i, '');

  return base
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((token) => {
      const lower = token.toLowerCase();
      const override = UPPERCASE_TOKEN_OVERRIDES[lower];
      if (override) return override;
      if (/^\d+$/.test(token)) return token;
      if (token.startsWith('$')) return token.toUpperCase();
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(' ');
}

export const TOPLESS_TATTOO_DETAIL_OPTIONS: G2DetailOptionLike[] = TOPLESS_TATTOO_FILES.map((file) => ({
  file: `/assets/wojak-layers/tattoos/${encodeURIComponent(file)}?v=${TATTOO_ASSET_VERSION}`,
  name: formatTattooLabel(file),
}));

export function createToplessTattooTrait(): G2TraitLike {
  return {
    id: TOPLESS_TATTOO_TRAIT_ID,
    name: 'Topless',
    category: 'Clothes',
    colorable: false,
    outlineFile: TOPLESS_BASE_FILE,
    detailOptions: TOPLESS_TATTOO_DETAIL_OPTIONS,
  };
}

export function augmentG2ManifestWithToplessTattoos<T extends G2ManifestLike>(manifest: T): T {
  const clothesCategory = manifest.categories.Clothes;
  if (!clothesCategory) return manifest;

  const toplessTrait = createToplessTattooTrait();
  const traits = manifest.traits.filter((trait) => trait.id !== TOPLESS_TATTOO_TRAIT_ID);
  traits.push(toplessTrait);

  const clothesTraits = clothesCategory.traits.filter((traitId) => traitId !== TOPLESS_TATTOO_TRAIT_ID);
  const tankTopIndex = clothesTraits.indexOf('Clothes_Tank-top');
  if (tankTopIndex === -1) {
    clothesTraits.push(TOPLESS_TATTOO_TRAIT_ID);
  } else {
    clothesTraits.splice(tankTopIndex + 1, 0, TOPLESS_TATTOO_TRAIT_ID);
  }

  return {
    ...manifest,
    categories: {
      ...manifest.categories,
      Clothes: {
        ...clothesCategory,
        traits: clothesTraits,
      },
    },
    traits,
  };
}
