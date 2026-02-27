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
  /** Which fill slot the single color picker edits (fill, fill0, fill1, fill2, etc.) */
  activeColorSlot?: string;
  /**
   * Trait-specific customization options.
   *
   * Known keys:
   * - detail: string — selected detail option filename
   * - frame: string — selected frame filename
   * - variant: string — selected variant filename
   * - logo: string — coin logo name (Astronaut, Cap, Comrad Hat, Hard Hat, Wizard Drip)
   * - flag: string — flag code (Astronaut)
   * - name1: string — BEPA Army name tag 1 (max 8 chars, caps)
   * - name2: string — BEPA Army name tag 2 (max 8 chars, caps)
   * - suitVariant: string — 'bepe' | 'pepe' (Bepe suit)
   * - chiaFarmerUnderlayer: string — 'tee' | 'tanktop' (Chia Farmer)
   * - constructionHelmetChiaLogo: boolean — Chia logo on/off (Construction Helmet)
   * - constructionHelmetCigPack: string — cig pack file (Construction Helmet)
   * - beerHatUnderlayer: string — trait ID of head under Beer Hat
   * - beerHatUnderlayerG2: G2Selection — full G2 selection for under head
   * - beerHatEditFocus: string — 'beer' | 'underlayer' (Beer Hat panel routing)
   */
  options: Record<string, string | boolean | G2Selection | undefined>;
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

/** Keys that can appear in SelectionsSnapshot: UI layers + Extra1/Extra2/Extra3 slots. */
export type SelectionKey = UILayerName | 'Extra1' | 'Extra2' | 'Extra3';

/** In-memory state: one structure per layer (includes extra slots for multi-select extras). */
export type SelectionsSnapshot = Partial<Record<SelectionKey, LayerSelection>>;

/** True if path means "no selection" (used by adapter, resolver, rules, UI). */
export function isSelectionPathEmpty(path: string | undefined): boolean {
  return !path || path === '' || path === 'None';
}

// ============ Generator State (legacy external shape) ============

export type SelectedLayers = Partial<Record<SelectionKey, string>>;

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
  disabledOptions: Partial<Record<UILayerName, Set<string>>>;
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
