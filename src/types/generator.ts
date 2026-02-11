/**
 * Generator Types
 *
 * Type definitions for the Wojak avatar generator system.
 */

import type { UILayerName } from '@/lib/layerRegistry';

// Re-export for convenience
export type { UILayerName } from '@/lib/layerRegistry';
export type { GeneratorLayerName } from '@/lib/memeLayers';

// ============ Layer System Types ============

// Simple string type for Trait.layer to maintain compatibility
export type LayerType =
  | 'background'
  | 'base'
  | 'clothes'
  | 'facialhair'
  | 'mouthbase'
  | 'mouthitem'
  | 'mask'
  | 'eyes'
  | 'head';

export interface Layer {
  type: UILayerName;
  order: number; // Rendering order (0 = bottom)
  required: boolean; // Must have a selection
  traits: Trait[];
  selectedTrait: Trait | null;
}

export interface Trait {
  id: string; // Unique identifier
  name: string; // Display name
  layer: LayerType;
  imagePath: string; // Path to trait image
  thumbnailPath: string; // Smaller preview image

  // Rendering properties
  zIndex?: number; // Override layer order
  offsetX?: number; // Position offset (px)
  offsetY?: number;

  // Combination rules
  rules?: TraitRules;

  // Metadata
  rarity?: number; // For randomization weighting (0-1)
  tags?: string[]; // For filtering/grouping
}

export interface TraitRules {
  // Mouth layer subtypes (legacy compatibility)
  mouthSubtype?: MouthSubtype;

  // Blocking rules
  blocks?: UILayerName[]; // This trait blocks other layers
  blockedBy?: string[]; // Trait IDs that block this trait

  // Dependency rules
  requires?: string[]; // Must have one of these traits
  requiresLayer?: UILayerName[]; // Must have selection in these layers

  // Combination rules
  exclusive?: boolean; // Can't combine with other mouth traits
  combinable?: boolean; // Can be combined with base mouth
}

// ============ Mouth Layer Specifics (Legacy) ============

export type MouthSubtype =
  | 'underlay' // Neckbeard, Stache (render below base)
  | 'base' // Numb, Smile, Teeth, Screaming
  | 'overlay' // Cig, Cohiba, Joint (render on top)
  | 'exclusive'; // Bandana-Mask, Bubble-Gum, Pipe, Pizza

export interface MouthSelection {
  underlay: Trait | null; // One underlay max
  base: Trait | null; // One base max
  overlay: Trait | null; // One overlay max (requires base)
  exclusive: Trait | null; // Replaces all others
}

export interface MouthValidation {
  isValid: boolean;
  warnings: MouthWarning[];
}

export interface MouthWarning {
  type: 'blocked' | 'requires' | 'exclusive' | 'incompatible';
  message: string;
  traitId: string;
}

export interface MouthSubtypeConfig {
  label: string;
  description: string;
  renderOrder: number;
  traits: string[];
  maxSelections: number;
  combinableWith: MouthSubtype[];
  requiresBase?: boolean;
  isExclusive?: boolean;
}

// ============ G2 Layer Selection ============

/**
 * Extra data for a G2 (YourWojak) trait selection.
 * Stored separately from SelectedLayers so the rules engine (which uses string paths)
 * continues to work unchanged.
 */
export interface G2Selection {
  /** G2 trait ID from manifest (e.g. "Clothes_Bathrobe") */
  traitId: string;
  /** G2 category from manifest (e.g. "Clothes", "Face-wear") */
  g2Category: string;
  /** User-chosen colors keyed by fill slot name */
  colors: Record<string, string>;
  /** Selected detail option filename (if any) */
  detailOption?: string;
  /** Selected frame filename (if any) */
  frameOption?: string;
  /** Selected variant filename (if any) */
  variant?: string;
  /** Astronaut: coin logo name (Detail 1) from CHIA_coin_logos */
  logoOption?: string;
  /** Astronaut: flag code (Detail 2) e.g. "us" */
  flagOption?: string;
  /** BEPA Army: name tag 1 text (max 8 chars, caps) */
  name1?: string;
  /** BEPA Army: name tag 2 text (max 8 chars, caps) */
  name2?: string;
  /** Which fill slot the single color picker edits (fill, fill0, fill1, fill2, etc.) */
  activeColorSlot?: string;
  /** Bepe suit: toggle between Bepe and Pepe variant (same layers, different art) */
  suitVariant?: 'bepe' | 'pepe';
  /** Chia Farmer: under-layer shown under the outfit — 'tee' or 'tanktop' */
  chiaFarmerUnderlayer?: 'tee' | 'tanktop';
  /** Construction Helmet: Chia logo on/off (can combine with cig pack) */
  constructionHelmetChiaLogo?: boolean;
  /** Construction Helmet: cigarette pack — '' | cig-pack file | cig-pack-2 file (mutually exclusive) */
  constructionHelmetCigPack?: string;
  /** Beer Hat: trait ID of head rendered underneath (Cap, Viking, etc.) */
  beerHatUnderlayer?: string;
  /** Beer Hat: full G2 selection for the under head (colors, details) */
  beerHatUnderlayerG2?: G2Selection;
  /** Beer Hat: when 'underlayer', right panel shows under head options; else shows Beer Hat can selector */
  beerHatEditFocus?: 'beer' | 'underlayer';
}

/**
 * Map of layer → G2 selection data.
 * Only layers with G2 traits selected will have entries.
 */
export type G2Selections = Partial<Record<UILayerName, G2Selection>>;

// ============ Unified selection (Phase 5) ============

/**
 * Single selection per layer: path (always for rules/draw), traitId when known, g2 when G2 trait.
 * Replaces dual selectedLayers + g2Selections in memory.
 */
export interface LayerSelection {
  path: string;
  traitId: string | null;
  g2?: G2Selection;
}

/** In-memory state: one structure per layer. */
export type SelectionsSnapshot = Partial<Record<UILayerName, LayerSelection>>;

/** True if path means "no selection" (used by adapter, resolver, rules, UI). */
export function isSelectionPathEmpty(path: string | undefined): boolean {
  return !path || path === '' || path === 'None';
}

// ============ Generator State (legacy external shape) ============

export type SelectedLayers = Partial<Record<UILayerName, string>>;

export interface GeneratorState {
  selectedLayers: SelectedLayers;

  // UI state
  activeLayer: UILayerName;
  isRendering: boolean;
  hasUnsavedChanges: boolean;

  // Preview
  previewImage: string | null; // Data URL of current composition
  isPreviewStale: boolean; // Needs re-render

  // Sticky preview (mobile)
  showStickyPreview: boolean;
  scrollPosition: number;

  // Disabled state from rules engine
  disabledLayers: UILayerName[];
  disabledOptions: Partial<Record<UILayerName, string[]>>;
  disabledReasons: Record<string, string>;
}

// ============ Favorites System ============

/** Storage version: 1 = dual shape (selections + g2Selections), 2 = unified only. */
export const FAVORITES_STORAGE_VERSION = 2;

/** Legacy favorite shape (version 1 or no version). */
export interface FavoriteWojakV1 {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  selections: SelectedLayers;
  g2Selections?: G2Selections;
  thumbnailDataUrl: string;
}

/** Current favorite shape (version 2): unified selections only. */
export interface FavoriteWojakV2 {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  version: 2;
  unifiedSelections: SelectionsSnapshot;
  thumbnailDataUrl: string;
}

export type FavoriteWojak = FavoriteWojakV1 | FavoriteWojakV2;

/** Type guard: true if favorite is v2 (unified). */
export function isFavoriteV2(f: FavoriteWojak): f is FavoriteWojakV2 {
  return (f as FavoriteWojakV2).version === 2;
}

// ============ Export Types ============

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp';
  size: ExportSize;
  quality?: number; // 0-1 for lossy formats
  includeBackground: boolean;
}

export type ExportSize =
  | { preset: '512' } // 512x512
  | { preset: '1024' } // 1024x1024 (default)
  | { preset: '2048' } // 2048x2048
  | { custom: { width: number; height: number } };

// ============ Layer Config Types ============

export interface LayerConfig {
  order: number;
  required: boolean;
  label: string;
  icon: string; // Lucide icon name
  description: string;
  hasSubtypes?: boolean;
}

// ============ Blocking Rules ============

export interface BlockingRule {
  blocks: UILayerName[];
  message: string;
}

// ============ Randomization ============

export interface RandomizationConfig {
  optionalLayerChance: number; // 0-1 chance to select optional layer
  mouthExclusiveChance: number; // 0-1 chance to pick exclusive mouth
  underlayChance: number;
  baseChance: number;
  overlayChance: number;
}

// ============ History (Undo/Redo) ============

export interface HistoryEntry {
  selections: SelectedLayers;
  timestamp: number;
}

export interface HistoryState {
  past: HistoryEntry[];
  present: HistoryEntry;
  future: HistoryEntry[];
  maxHistory: number;
}
