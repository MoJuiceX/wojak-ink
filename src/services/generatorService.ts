/**
 * Generator Service
 *
 * Loads Wojak layer data from manifest.json for the character generator.
 * Implements the complex layer categorization from wojak-ink-mobile.
 */

import type { Trait } from '@/types/generator';
import { UI_LAYER_NAMES, type UILayerName } from '@/lib/memeLayers';
import { formatDisplayLabel, cleanDisplayName } from '@/lib/traitOptions';
import { lookupTraitName } from '@/lib/traitNameMap';
import { G1_TO_G2_MAP, normalizeTraitName } from '@/lib/traitMapping';
import { G2_CATEGORY_TO_UI, G1_FOLDER_TO_UI } from '@/config/generatorLayerMapping';
import { MOUTH_BASE_PATTERNS, MOUTH_ITEM_PATTERNS, MASK_PATTERNS, FACIAL_HAIR_PATTERNS } from '@/lib/generatorTraitIds';
import { LAYER_BASE, G2_LAYER_BASE } from '@/config/layerAssetBase';
import { augmentG2ManifestWithToplessTattoos } from '@/config/toplessTattooDetails';

// ============ Types ============

type ManifestData = Record<string, string[]>;

export interface LayerImage {
  path: string;
  name: string;
  displayName: string;
  category?: string;
}

// ============ Cache ============

let manifestCache: ManifestData | null = null;
const layerImagesCache: Map<UILayerName, LayerImage[]> = new Map();

/** Background entries we require even if an older manifest is served. */
const REQUIRED_BACKGROUND_ENTRIES = ['Scene/BACKGROUND_Everythings-Fine.png'] as const;

// ============ Mouth Item Classification ============
// Classification patterns imported from generatorTraitIds.ts:
// MOUTH_BASE_PATTERNS, MOUTH_ITEM_PATTERNS, MASK_PATTERNS, FACIAL_HAIR_PATTERNS

// Base layer sort order
const BASE_SORT_ORDER = ['classic', 'rekt', 'rugged', 'bleeding', 'terminator'];

// ============ Loaders ============

async function loadManifest(): Promise<ManifestData> {
  if (manifestCache) return manifestCache;

  const response = await fetch(`${LAYER_BASE}/manifest.json`);
  if (!response.ok) {
    throw new Error(`Failed to load layer manifest: ${response.status} ${response.statusText}`);
  }
  manifestCache = await response.json();
  return manifestCache!;
}

function parseDisplayName(filepath: string): string {
  const cleaned = cleanDisplayName(filepath);
  // Check canonical TRAIT_NAME_MAP first — matches metadata names exactly.
  // Skip "Fake It Mask" mappings (metadata-only consolidation; grid keeps individual mask names)
  const canonical = lookupTraitName(cleaned);
  if (canonical && canonical !== 'Fake It Mask') return canonical;
  // Fallback to legacy formatting for unknown traits
  return formatDisplayLabel(cleaned);
}

/** Layer-specific display name overrides applied after TRAIT_NAME_MAP lookup */
const DISPLAY_LAYER_OVERRIDES: Partial<Record<UILayerName, Record<string, string>>> = {
  Clothes: { 'Super Saiyan': 'Super Saiyan Uniform' },
};

/**
 * Canonicalize a trait display name to match canonical metadata naming.
 * Uses TRAIT_NAME_MAP as source of truth, with layer-specific overrides.
 * Applied to G2 traits whose names come directly from the CDN manifest.
 */
function canonicalizeTraitName(rawName: string, uiLayer: UILayerName): string {
  const normalized = rawName.replace(/[-_]/g, ' ').trim();
  const mapped = lookupTraitName(normalized);
  if (mapped && mapped !== 'Fake It Mask') {
    return DISPLAY_LAYER_OVERRIDES[uiLayer]?.[mapped] || mapped;
  }
  return rawName;
}

function classifyMouthItem(filepath: string): UILayerName | null {
  const lower = filepath.toLowerCase();
  const filename = filepath.split('/').pop()?.toLowerCase() || '';

  // Check for EXTRA_MOUTH items first
  if (filename.startsWith('extra_mouth')) {
    // FacialHair items
    for (const pattern of FACIAL_HAIR_PATTERNS) {
      if (lower.includes(pattern)) {
        return 'FacialHair';
      }
    }
    // Mask items (Copium)
    for (const pattern of MASK_PATTERNS) {
      if (lower.includes(pattern)) {
        return 'Mask';
      }
    }
    // MouthItem items (Cig, Joint, Cohiba)
    for (const pattern of MOUTH_ITEM_PATTERNS) {
      if (lower.includes(pattern)) {
        return 'MouthItem';
      }
    }
    return null;
  }

  // Regular MOUTH items
  // Mask items (Bandana, Hannibal)
  for (const pattern of MASK_PATTERNS) {
    if (lower.includes(pattern)) {
      return 'Mask';
    }
  }

  // MouthBase items
  for (const pattern of MOUTH_BASE_PATTERNS) {
    if (lower.includes(pattern)) {
      return 'MouthBase';
    }
  }

  return null;
}

function buildLayerImages(manifest: ManifestData): void {
  // Clear cache
  layerImagesCache.clear();

  // Initialize all UI layers
  for (const layerName of UI_LAYER_NAMES) {
    layerImagesCache.set(layerName as UILayerName, []);
  }

  // Process BACKGROUND (Scene + Solid color + Price overlays + $CASHTAG)
  const bgLayer = G1_FOLDER_TO_UI['BACKGROUND'];
  if (bgLayer && manifest['BACKGROUND']) {
    const backgroundEntries = [...manifest['BACKGROUND']];
    for (const requiredEntry of REQUIRED_BACKGROUND_ENTRIES) {
      if (!backgroundEntries.includes(requiredEntry)) {
        backgroundEntries.push(requiredEntry);
      }
    }

    const images: (LayerImage & { manifestIndex: number })[] = backgroundEntries.map((filepath, index) => {
      const isSolid = filepath === '__solid__';
      const isPriceUp = filepath === '__price_up__';
      const isPriceDown = filepath === '__price_down__';
      const isOverlay = isPriceUp || isPriceDown;
      return {
        path: isSolid ? '__solid__' : isOverlay ? filepath : `${LAYER_BASE}/BACKGROUND/${filepath}`,
        name: filepath.split('/').pop()?.replace(/\.(png|jpg|jpeg|webp)$/i, '') || '',
        displayName: isSolid ? 'Solid color' : isPriceUp ? 'Price up' : isPriceDown ? 'Price down' : parseDisplayName(filepath),
        category: isSolid ? 'custom' : isOverlay ? 'overlay' : (filepath.includes('/') ? filepath.split('/')[0] : undefined),
        manifestIndex: index,
      };
    });
    images.sort((a, b) => {
      // Solid color first, then overlays, then Scene (alphabetically), then $CASHTAG (manifest order)
      const aSolid = a.path.includes('__solid__');
      const bSolid = b.path.includes('__solid__');
      const aOverlay = a.category === 'overlay';
      const bOverlay = b.category === 'overlay';
      const aScene = a.category === 'Scene';
      const bScene = b.category === 'Scene';
      const aCashtag = a.category === '$CASHTAG';
      const bCashtag = b.category === '$CASHTAG';
      // Solid color first
      if (aSolid && !bSolid) return -1;
      if (!aSolid && bSolid) return 1;
      // Overlays second
      if (aOverlay && !bOverlay && !bSolid) return -1;
      if (!aOverlay && bOverlay && !aSolid) return 1;
      if (aSolid && bSolid) return 0;
      if (aOverlay && bOverlay) return a.manifestIndex - b.manifestIndex;
      // Scene third (alphabetically)
      if (aScene && !bScene) return -1;
      if (!aScene && bScene) return 1;
      if (aScene && bScene) return (a.displayName || '').localeCompare(b.displayName || '');
      // $CASHTAG fourth (manifest order)
      if (aCashtag && bCashtag) return a.manifestIndex - b.manifestIndex;
      // Everything else by manifest order
      return a.manifestIndex - b.manifestIndex;
    });
    // Remove manifestIndex before caching
    layerImagesCache.set(bgLayer, images.map(({ manifestIndex: _manifestIndex, ...rest }) => rest));
  }

  // Process BASE
  const baseLayer = G1_FOLDER_TO_UI['BASE'];
  if (baseLayer && manifest['BASE']) {
    const images: LayerImage[] = manifest['BASE'].map((filepath) => ({
      path: `${LAYER_BASE}/BASE/${filepath}`,
      name: filepath.split('/').pop()?.replace(/\.(png|jpg|jpeg|webp)$/i, '') || '',
      displayName: parseDisplayName(filepath),
    }));
    images.sort((a, b) => {
      const aLower = a.path.toLowerCase();
      const bLower = b.path.toLowerCase();
      const aIndex = BASE_SORT_ORDER.findIndex((name) => aLower.includes(name));
      const bIndex = BASE_SORT_ORDER.findIndex((name) => bLower.includes(name));
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
    layerImagesCache.set(baseLayer, images);
  }

  // Process CLOTHES
  const clothesLayer = G1_FOLDER_TO_UI['CLOTHES'];
  if (clothesLayer && manifest['CLOTHES']) {
    const images: LayerImage[] = manifest['CLOTHES'].map((filepath) => ({
      path: `${LAYER_BASE}/CLOTHES/${filepath}`,
      name: filepath.split('/').pop()?.replace(/\.(png|jpg|jpeg|webp)$/i, '') || '',
      displayName: parseDisplayName(filepath),
    }));
    layerImagesCache.set(clothesLayer, images);
  }

  // Process EYE -> Eyes
  const eyesLayer = G1_FOLDER_TO_UI['EYE'];
  if (eyesLayer && manifest['EYE']) {
    const images: LayerImage[] = manifest['EYE'].map((filepath) => ({
      path: `${LAYER_BASE}/EYE/${filepath}`,
      name: filepath.split('/').pop()?.replace(/\.(png|jpg|jpeg|webp)$/i, '') || '',
      displayName: parseDisplayName(filepath),
    }));
    layerImagesCache.set(eyesLayer, images);
  }

  // Process HEAD
  const headLayer = G1_FOLDER_TO_UI['HEAD'];
  if (headLayer && manifest['HEAD']) {
    const images: LayerImage[] = manifest['HEAD'].map((filepath) => ({
      path: `${LAYER_BASE}/HEAD/${filepath}`,
      name: filepath.split('/').pop()?.replace(/\.(png|jpg|jpeg|webp)$/i, '') || '',
      displayName: parseDisplayName(filepath),
    }));
    layerImagesCache.set(headLayer, images);
  }

  // Process MOUTH -> categorize into MouthBase, MouthItem, Mask, FacialHair
  if (manifest['MOUTH']) {
    const mouthBaseImages: LayerImage[] = [];
    const mouthItemImages: LayerImage[] = [];
    const maskImages: LayerImage[] = [];
    const facialHairImages: LayerImage[] = [];

    for (const filepath of manifest['MOUTH']) {
      const category = classifyMouthItem(filepath);
      const image: LayerImage = {
        path: `${LAYER_BASE}/MOUTH/${filepath}`,
        name: filepath.split('/').pop()?.replace(/\.(png|jpg|jpeg|webp)$/i, '') || '',
        displayName: parseDisplayName(filepath),
      };

      switch (category) {
        case 'MouthBase':
          mouthBaseImages.push(image);
          break;
        case 'MouthItem':
          mouthItemImages.push(image);
          break;
        case 'Mask':
          maskImages.push(image);
          break;
        case 'FacialHair':
          facialHairImages.push(image);
          break;
      }
    }

    layerImagesCache.set('MouthBase', mouthBaseImages);
    layerImagesCache.set('MouthItem', mouthItemImages);
    layerImagesCache.set('Mask', maskImages);
    layerImagesCache.set('FacialHair', facialHairImages);
  }

  // Process MASK folder (skull masks, etc.) - add to existing Mask images
  const maskLayer = G1_FOLDER_TO_UI['MASK'];
  if (maskLayer && manifest['MASK']) {
    const existingMaskImages = layerImagesCache.get(maskLayer) || [];
    const newMaskImages: LayerImage[] = manifest['MASK'].map((filepath) => ({
      path: `${LAYER_BASE}/MASK/${filepath}`,
      name: filepath.split('/').pop()?.replace(/\.(png|jpg|jpeg|webp)$/i, '') || '',
      displayName: parseDisplayName(filepath),
    }));
    layerImagesCache.set(maskLayer, [...existingMaskImages, ...newMaskImages]);
  }

  // Process EXTRA folder (hand items, wings) - add to existing Mask images (shown in Extras tab)
  if (manifest['EXTRA']) {
    const existingMaskImages = layerImagesCache.get('Mask') || [];
    const newExtraImages: LayerImage[] = manifest['EXTRA'].map((filepath) => ({
      path: `${LAYER_BASE}/EXTRA/${filepath}`,
      name: filepath.split('/').pop()?.replace(/\.(png|jpg|jpeg|webp)$/i, '') || '',
      displayName: parseDisplayName(filepath),
    }));
    layerImagesCache.set('Mask', [...existingMaskImages, ...newExtraImages]);
  }
}

// ============ Public API ============

export function getAllLayerImages(layerName: UILayerName): LayerImage[] {
  return layerImagesCache.get(layerName) || [];
}

export function getLayerImageByPath(layerName: UILayerName, path: string): LayerImage | undefined {
  const images = layerImagesCache.get(layerName);
  return images?.find((img) => img.path === path);
}

// ============ Service Interface ============

export interface IGeneratorService {
  getAllTraits(): Promise<Trait[]>;
  getTraitsByLayer(layer: UILayerName): Promise<Trait[]>;
  getTraitById(id: string): Promise<Trait | null>;
  prefetchLayers(): Promise<void>;
  getLayerImages(layer: UILayerName): Promise<LayerImage[]>;
}

function convertToTrait(image: LayerImage, layer: UILayerName, index: number): Trait {
  return {
    id: `${layer.toLowerCase()}-${index}`,
    name: image.name,
    layer: layer.toLowerCase() as Trait['layer'],
    imagePath: image.path,
    thumbnailPath: image.path,
    rarity: 0,
    tags: image.category ? [image.category] : [],
  };
}

class GeneratorService implements IGeneratorService {
  private initialized = false;

  async prefetchLayers(): Promise<void> {
    if (this.initialized) return;

    const manifest = await loadManifest();
    buildLayerImages(manifest);
    this.initialized = true;
  }

  async getLayerImages(layer: UILayerName): Promise<LayerImage[]> {
    await this.prefetchLayers();
    return getAllLayerImages(layer);
  }

  async getAllTraits(): Promise<Trait[]> {
    await this.prefetchLayers();

    const allTraits: Trait[] = [];

    for (const layerName of UI_LAYER_NAMES) {
      const images = getAllLayerImages(layerName as UILayerName);
      images.forEach((image, index) => {
        allTraits.push(convertToTrait(image, layerName as UILayerName, index));
      });
    }

    return allTraits;
  }

  async getTraitsByLayer(layer: UILayerName): Promise<Trait[]> {
    await this.prefetchLayers();

    const images = getAllLayerImages(layer);
    return images.map((image, index) => convertToTrait(image, layer, index));
  }

  async getTraitById(id: string): Promise<Trait | null> {
    const allTraits = await this.getAllTraits();
    return allTraits.find((t) => t.id === id) || null;
  }
}

// Singleton instance
export const generatorService = new GeneratorService();

// ============ G2 (YourWojak) Manifest Types ============

interface G2ManifestTrait {
  id: string;
  name: string;
  category: string;
  colorable: boolean;
  // Single fill
  fillFile?: string;
  fill3File?: string;
  fillNamePositionFile?: string;
  /** When default color selected, use this instead of tinted fill (e.g. Astronaut) */
  defaultFile?: string;
  // Dual fill
  fill1File?: string;
  fill2File?: string;
  // Multi fill
  fillFiles?: string[];
  // Outlines
  outlineFile?: string;
  outline2File?: string;
  outlineFileForFill?: string;
  detailOverlayFile?: string;
  outlineFiles?: string[];
  // Details
  detailFile?: string;
  detailOptions?: { file: string; name: string; splitLeft?: string; splitRight?: string }[];
  /** Outline overlay for detail1 (e.g. Comrad Hat star outline) — renders on top of detail1 fill */
  detail1OverlayFile?: string;
  // Pre-split images (Beer Hat: left-main and right-behind halves to avoid runtime clipping)
  outlineSplitLeft?: string;
  outlineSplitRight?: string;
  // Composite
  composite?: boolean;
  layer0File?: string;
  layer1File?: string;
  /** Composite layers (e.g. Bepe-suit) or layered colorable (e.g. Ninja-turtle-fit). type: other=composite, fill|outline=layered */
  layers?: { pos: number; key: string; type: string; label: string; file: string; visible: boolean; underBase?: boolean; opacity?: number }[];
  fills?: Record<string, { treatment: string; amount: number; source: string }>;
  // Colors
  defaultColor?: string;
  defaultColor2?: string;
  defaultColors?: string[];
  // Variants
  variants?: { file: string; color: string; name: string }[];
  // Special
  autoComplement?: boolean;
  frameFiles?: { file: string; name: string; over: string }[];
  textAreas?: unknown[];
  /** G1 fallback path (for traits with both G1 and G2 versions) */
  g1Path?: string;
}

interface G2Manifest {
  version: number;
  collection: string;
  basePath: string;
  categories: Record<string, {
    layerName: string;
    zIndex: number;
    description: string;
    traits: string[];
  }>;
  traits: G2ManifestTrait[];
}

// ============ Unified Trait Type ============

export interface UnifiedTrait {
  id: string;
  name: string;
  category: UILayerName;
  source: 'g1' | 'g2' | 'both';
  // G1 data
  g1Path?: string;
  g1Variants?: string[];
  // G2 data
  colorable?: boolean;
  fillFile?: string;
  fill3File?: string;
  fillNamePositionFile?: string;
  defaultFile?: string;
  fill1File?: string;
  fill2File?: string;
  fillFiles?: string[];
  outlineFile?: string;
  outline2File?: string;
  outlineFileForFill?: string;
  detailOverlayFile?: string;
  outlineFiles?: string[];
  detailFile?: string;
  detailOptions?: { file: string; name: string; splitLeft?: string; splitRight?: string }[];
  detail1OverlayFile?: string;
  // Pre-split images (Beer Hat: left-main and right-behind halves to avoid runtime clipping)
  outlineSplitLeft?: string;
  outlineSplitRight?: string;
  composite?: boolean;
  layer0File?: string;
  layer1File?: string;
  layers?: { pos: number; key: string; type: string; label: string; file: string; visible: boolean; underBase?: boolean; opacity?: number }[];
  fills?: Record<string, { treatment: string; amount: number; source: string }>;
  defaultColor?: string;
  defaultColor2?: string;
  defaultColors?: string[];
  variants?: { file: string; color: string; name: string }[];
  autoComplement?: boolean;
  frameFiles?: { file: string; name: string; over: string }[];
  textAreas?: unknown[];
}

// ============ G2 Loader ============

let g2ManifestCache: G2Manifest | null = null;
let g2TraitIndex: Map<string, G2ManifestTrait> | null = null;
const unifiedTraitsCache: Map<UILayerName, UnifiedTrait[]> = new Map();

const G2_BASE_PATH = G2_LAYER_BASE;

async function loadG2Manifest(): Promise<G2Manifest | null> {
  if (g2ManifestCache) return g2ManifestCache;

  try {
    const response = await fetch(`${G2_BASE_PATH}/manifest.json`);
    if (!response.ok) throw new Error('Failed to load G2 manifest');
    const rawManifest = await response.json() as G2Manifest;
    g2ManifestCache = augmentG2ManifestWithToplessTattoos(rawManifest);
    if (g2ManifestCache) {
      g2TraitIndex = new Map(g2ManifestCache.traits.map(t => [t.id, t]));
    }
    return g2ManifestCache;
  } catch (error) {
    console.error('[GeneratorService] Failed to load G2 manifest:', error);
    return null;
  }
}

/**
 * Extract the base trait name from a G1 filename.
 * e.g. "CLOTHES_Bathrobe_blue.png" → "Bathrobe"
 *      "HEAD_Wizard-Hat_man_blue.png" → "Wizard-Hat_man" (or "Wizard-Hat")
 */
function extractG1BaseName(filepath: string, prefix: string): string {
  // Strip folder path and prefix
  const filename = filepath.split('/').pop() || filepath;
  const withoutPrefix = filename.replace(new RegExp(`^${prefix}_`, 'i'), '');
  const withoutExt = withoutPrefix.replace(/\.(png|jpg|jpeg|webp)$/i, '');

  // Remove trailing underscore (e.g. "Astronaut_" → "Astronaut")
  const trimmed = withoutExt.replace(/_$/, '');

  // Split remaining by underscore; first part is base name
  // But some names have underscores (e.g. "Wizard-Hat_man"), so we need smarts:
  // If the last part looks like a color/variant, strip it
  const parts = trimmed.split('_');
  if (parts.length <= 1) return trimmed;

  // Known color suffixes
  const colorSuffixes = new Set([
    'black', 'blue', 'red', 'green', 'orange', 'pink', 'purple',
    'brown', 'white', 'neon-green', 'yellow', 'blond',
  ]);
  // Check if last part is a color
  const lastPart = parts[parts.length - 1].toLowerCase();
  if (colorSuffixes.has(lastPart)) {
    return parts.slice(0, -1).join('_');
  }

  // For suits: "Suit_black_red-bow" → "Suit"
  if (parts[0].toLowerCase() === 'suit') return 'Suit';

  return trimmed;
}

/**
 * Try to find G2 match for a G1 base name.
 * First checks hardcoded mapping, then tries normalized fuzzy match.
 */
function findG2Match(g1BaseName: string, g2Traits: G2ManifestTrait[]): G2ManifestTrait | null {
  // 1. Check hardcoded mapping
  const g2Id = G1_TO_G2_MAP[g1BaseName];
  if (g2Id) {
    const match = g2TraitIndex?.get(g2Id);
    if (match) return match;
  }

  // 2. Normalized fuzzy match on name
  const normalized = normalizeTraitName(g1BaseName);
  for (const trait of g2Traits) {
    if (normalizeTraitName(trait.name) === normalized) return trait;
    // Also try matching against the part after the category prefix in the ID
    const idName = trait.id.includes('_') ? trait.id.split('_').slice(1).join('_') : trait.id;
    if (normalizeTraitName(idName) === normalized) return trait;
  }

  return null;
}

/**
 * Derive detailOptions, outlineFile, fillFile, and fillFiles from layers when manifest uses layers-only format.
 */
function deriveFromLayers(g2: G2ManifestTrait): {
  detailOptions?: { file: string; name: string }[];
  outlineFile?: string;
  fillFile?: string;
  fillFiles?: string[];
} {
  const layers = g2.layers;
  if (!layers?.length) return {};
  const detailOptions = g2.detailOptions ?? layers.filter(l => l.type === 'detail').map(l => ({ file: l.file, name: l.label }));
  const outlineLayer = layers.find(l => l.type === 'outline');
  const outlineFile = g2.outlineFile ?? outlineLayer?.file;
  const fillLayers = layers.filter(l => l.type === 'fill').sort((a, b) => a.pos - b.pos);
  const fillLayer = fillLayers[0];
  const fillFile = g2.fillFile ?? fillLayer?.file;
  const fillFiles = g2.fillFiles ?? (fillLayers.length ? fillLayers.map(l => l.file) : undefined);
  return { detailOptions: detailOptions.length ? detailOptions : undefined, outlineFile, fillFile, fillFiles };
}

/**
 * Build unified trait from G2 manifest data.
 */
function g2TraitToUnified(g2: G2ManifestTrait, uiLayer: UILayerName): UnifiedTrait {
  const { detailOptions, outlineFile, fillFile, fillFiles } = deriveFromLayers(g2);
  return {
    id: g2.id,
    name: g2.name,
    category: uiLayer,
    source: 'g2',
    colorable: g2.colorable,
    fillFile: fillFile ?? g2.fillFile,
    fill3File: g2.fill3File,
    fillNamePositionFile: g2.fillNamePositionFile,
    defaultFile: g2.defaultFile,
    fill1File: g2.fill1File,
    fill2File: g2.fill2File,
    fillFiles: fillFiles ?? g2.fillFiles,
    outlineFile: outlineFile ?? g2.outlineFile,
    outline2File: g2.outline2File,
    outlineFileForFill: g2.outlineFileForFill,
    detailOverlayFile: g2.detailOverlayFile,
    outlineFiles: g2.outlineFiles,
    detailFile: g2.detailFile,
    detailOptions: detailOptions ?? g2.detailOptions,
    detail1OverlayFile: g2.detail1OverlayFile,
    outlineSplitLeft: g2.outlineSplitLeft,
    outlineSplitRight: g2.outlineSplitRight,
    composite: g2.composite,
    layer0File: g2.layer0File,
    layer1File: g2.layer1File,
    layers: g2.layers,
    fills: g2.fills,
    defaultColor: g2.defaultColor ?? g2.defaultColors?.[0],
    defaultColor2: g2.defaultColor2,
    defaultColors: g2.defaultColors,
    variants: g2.variants,
    autoComplement: g2.autoComplement,
    frameFiles: g2.frameFiles,
    textAreas: g2.textAreas,
    g1Path: g2.g1Path,
  };
}

/**
 * Build unified traits for a given UI layer by merging G1 images and G2 traits.
 */
function buildUnifiedTraitsForLayer(
  uiLayer: UILayerName,
  g1Images: LayerImage[],
  g2Traits: G2ManifestTrait[],
): UnifiedTrait[] {
  const result: UnifiedTrait[] = [];
  const matchedG2Ids = new Set<string>();

  // Group G1 images by base name to deduplicate color variants
  const g1Groups = new Map<string, LayerImage[]>();
  const g1Prefix = uiLayer === 'Clothes' ? 'CLOTHES'
    : uiLayer === 'Head' ? 'HEAD'
    : uiLayer === 'Eyes' ? 'EYE'
    : uiLayer === 'MouthBase' || uiLayer === 'MouthItem' || uiLayer === 'FacialHair' || uiLayer === 'Mask' ? 'MOUTH'
    : uiLayer === 'Base' ? 'BASE'
    : uiLayer === 'Background' ? 'BACKGROUND'
    : '';

  for (const img of g1Images) {
    const baseName = extractG1BaseName(img.name, g1Prefix);
    if (!g1Groups.has(baseName)) {
      g1Groups.set(baseName, []);
    }
    g1Groups.get(baseName)!.push(img);
  }

  // For each G1 group, try to find a G2 match
  for (const [baseName, variants] of g1Groups) {
    const g2Match = findG2Match(baseName, g2Traits);

    if (g2Match) {
      // G2 match: use G2 preview; set g1Path so pathToTraitIdMap and "selected" state work (e.g. Viking from randomize)
      matchedG2Ids.add(g2Match.id);
      const unified = g2TraitToUnified(g2Match, uiLayer);
      unified.source = 'g2';
      unified.g1Path = variants[0].path;
      unified.g1Variants = variants.length > 1 ? variants.map(v => v.path) : undefined;
      result.push(unified);
    } else {
      // G1 only
      result.push({
        id: `g1_${baseName}`,
        name: variants[0].displayName,
        category: uiLayer,
        source: 'g1',
        g1Path: variants[0].path,
        g1Variants: variants.length > 1 ? variants.map(v => v.path) : undefined,
      });
    }
  }

  // Add G2-only traits (not matched to any G1)
  for (const g2 of g2Traits) {
    if (!matchedG2Ids.has(g2.id)) {
      result.push(g2TraitToUnified(g2, uiLayer));
    }
  }

  // Canonicalize all trait display names to match metadata
  // Fixes G2 lowercase/typo names and applies layer-specific overrides
  for (const trait of result) {
    trait.name = canonicalizeTraitName(trait.name, uiLayer);
  }

  return result;
}

// ============ Unified Traits Public API ============

/**
 * Get unified traits for a UI layer (merged G1 + G2).
 * Returns UnifiedTrait[] with source flag indicating origin.
 */
export async function getUnifiedTraits(layer: UILayerName): Promise<UnifiedTrait[]> {
  // Check cache
  const cached = unifiedTraitsCache.get(layer);
  if (cached) return cached;

  // Ensure both manifests are loaded (parallel — they are independent)
  const [, g2Manifest] = await Promise.all([
    generatorService.prefetchLayers(),
    loadG2Manifest(),
  ]);

  // Get G1 images for this layer
  const g1Images = getAllLayerImages(layer);

  // Get G2 traits for this layer
  const g2Traits: G2ManifestTrait[] = [];
  if (g2Manifest) {
    // Find which G2 categories map to this UI layer
    for (const [catName, catData] of Object.entries(g2Manifest.categories)) {
      if (G2_CATEGORY_TO_UI[catName] === layer) {
        // Get full trait data for each trait id in this category
        for (const traitId of catData.traits) {
          const traitData = g2TraitIndex?.get(traitId);
          if (traitData) g2Traits.push(traitData);
        }
      }
    }
  }

  // Merge
  const unified = buildUnifiedTraitsForLayer(layer, g1Images, g2Traits);
  unifiedTraitsCache.set(layer, unified);
  return unified;
}

/**
 * Get a specific unified trait by its id.
 * Falls back to raw G2 manifest for traits not in categories (e.g. Clothes_Pepe-suit).
 */
export async function getUnifiedTraitById(id: string): Promise<UnifiedTrait | null> {
  for (const layerName of UI_LAYER_NAMES) {
    const traits = await getUnifiedTraits(layerName as UILayerName);
    const found = traits.find(t => t.id === id);
    if (found) return found;
  }
  // Fallback: trait may exist in manifest but not in any category (e.g. Clothes_Pepe-suit)
  const g2Manifest = await loadG2Manifest();
  if (g2Manifest) {
    const g2Trait = g2TraitIndex?.get(id);
    if (g2Trait) {
      const catPart = id.includes('_') ? id.split('_')[0] : id;
      const uiLayer = (G2_CATEGORY_TO_UI[catPart] ?? 'Clothes') as UILayerName;
      return g2TraitToUnified(g2Trait, uiLayer);
    }
  }
  return null;
}

/**
 * Get the G2 base path for resolving fill/outline file URLs.
 */
export function getG2BasePath(): string {
  return G2_BASE_PATH;
}

/**
 * Get composite layer file paths in draw order.
 * Uses layers array when present (e.g. Bepe-suit), else layer0File/layer1File.
 */
export function getCompositeLayerFiles(trait: UnifiedTrait, basePath: string): string[] {
  return getCompositeLayerEntries(trait, basePath).map(e => e.path);
}

/** Composite layer with underBase flag (for z-order: underBase renders below Base) */
export interface CompositeLayerEntry {
  path: string;
  underBase: boolean;
}

/**
 * Get composite layer entries (path + underBase) in draw order.
 */
export function getCompositeLayerEntries(trait: UnifiedTrait, basePath: string): CompositeLayerEntry[] {
  if (trait.layers && trait.layers.length > 0) {
    return trait.layers
      .filter(l => l.visible !== false)
      .sort((a, b) => a.pos - b.pos)
      .map(l => ({ path: `${basePath}/${l.file}`, underBase: !!l.underBase }));
  }
  const out: CompositeLayerEntry[] = [];
  if (trait.layer0File) out.push({ path: `${basePath}/${trait.layer0File}`, underBase: false });
  if (trait.layer1File) out.push({ path: `${basePath}/${trait.layer1File}`, underBase: false });
  return out;
}

/**
 * Clear the unified traits cache (e.g. when manifests change).
 */
export function clearUnifiedTraitsCache(): void {
  unifiedTraitsCache.clear();
  pathToTraitIdMapCache = null;
  g2ManifestCache = null;
  g2TraitIndex = null;
}

// ============ Path → TraitId Map (for selection resolver) ============

let pathToTraitIdMapCache: Map<string, string> | null = null;

function buildPathToTraitIdMap(): void {
  const map = new Map<string, string>();
  for (const layer of UI_LAYER_NAMES) {
    const traits = unifiedTraitsCache.get(layer as UILayerName);
    if (!traits) continue;
    for (const trait of traits) {
      if (trait.g1Path) map.set(trait.g1Path, trait.id);
      if (trait.g1Variants) {
        for (const p of trait.g1Variants) map.set(p, trait.id);
      }
      // Virtual path used when G2 is selected (e.g. /g2/Head/Viking-helmet) so path-only state can resolve to traitId
      if (trait.source === 'g2' || trait.source === 'both') {
        const virtualPath = `/g2/${trait.category}/${trait.name.replace(/\s+/g, '-')}`;
        map.set(virtualPath, trait.id);
      }
    }
  }
  pathToTraitIdMapCache = map;
}

/**
 * Ensure unified traits and pathToTraitId map are built (for resolver and rules).
 * Call once before using the generator; generator UI can show loading until this resolves.
 */
export async function ensurePathToTraitIdMapReady(): Promise<void> {
  if (pathToTraitIdMapCache) return;
  for (const layer of UI_LAYER_NAMES) {
    await getUnifiedTraits(layer as UILayerName);
  }
  buildPathToTraitIdMap();
}

/**
 * Get the path → traitId map (for createSelectionResolver).
 * Returns empty map if not yet built; call ensurePathToTraitIdMapReady() first.
 */
export function getPathToTraitIdMap(): Map<string, string> {
  return pathToTraitIdMapCache ?? new Map();
}

/**
 * True after ensurePathToTraitIdMapReady() has completed (pathToTraitIdMap is built).
 */
export function isGeneratorReady(): boolean {
  return pathToTraitIdMapCache !== null;
}
