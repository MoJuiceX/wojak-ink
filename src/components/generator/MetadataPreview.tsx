/* eslint-disable react-refresh/only-export-components */
/**
 * MetadataPreview — Dev/QA tool to preview NFT metadata
 *
 * Shows the CHIP-0007 attributes table for the current generator selections.
 * Uses the definitive TRAIT_NAME_MAP for all name lookups.
 * Renders in the right panel (replaces color picker when active).
 *
 * Phase 1 has exactly 7 trait_types: Background, Base, Clothes, Face, Face Wear, Head, Mouth
 *
 * Generator layer → Phase 1 trait_type mapping:
 *   Base files      → "Face" (Classic, Rekt, Terminator, Rugged, Bleeding Bags)
 *   (fixed)         → "Base" always = "Wojak"
 *   Eyes            → "Face Wear" (glasses, laser eyes, etc.)
 *   Mask            → "Face Wear" (skull mask, medievalbepe, etc.)
 *   MouthBase       → "Mouth" (numb, smile, teeth, pizza, pipe, etc.)
 *   MouthItem       → "Mouth" (cig, joint, cohiba, bubble gum, etc.)
 *   FacialHair      → "Mouth" (neckbeard, stache)
 *   Head            → "Head"
 *   Clothes         → "Clothes"
 *   Background      → "Background"
 *
 * When multiple layers map to the same trait_type, the most specific wins:
 *   Face Wear: Mask > Eyes
 *   Mouth: MouthItem > FacialHair > MouthBase
 */

import { useMemo, useContext } from 'react';
import { useGeneratorOptional } from '@/contexts/GeneratorContext';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';
import { isSelectionPathEmpty } from '@/types/generator';
import { lookupTraitName, lookupBackgroundColorName } from '@/lib/traitNameMap';
import { cleanDisplayName, formatDisplayLabel } from '@/lib/traitOptions';

/**
 * Maps each generator layer to its Phase 1 trait_type.
 * Base → "Face" because the base files (classic, rekt, etc.) are the face expression.
 * A fixed "Base: Wojak" entry is always injected separately.
 */
const LAYER_TO_TRAIT_TYPE: Record<string, string> = {
  Base: 'Face',
  Eyes: 'Face Wear',
  Mask: 'Face Wear',
  MouthBase: 'Mouth',
  MouthItem: 'Mouth',
  FacialHair: 'Mouth',
  Head: 'Head',
  Clothes: 'Clothes',
  Background: 'Background',
  Extra1: 'Extra',
  Extra2: 'Extra',
  Extra3: 'Extra',
};

/** Default color for solid color backgrounds - sky blue */
const SOLID_BG_DEFAULT_COLOR = '#38BDF8';

/**
 * Phase 1 rarity counts (out of 4200 NFTs).
 * Used for consolidation: when multiple layers map to the same trait_type,
 * the rarer trait (lower count) wins. Traits not in Phase 1 default to 0 (rarest).
 */
const PHASE1_RARITY: Record<string, number> = {
  // Mouth values
  'Numb': 490,
  'Cig': 414,
  'Screaming': 348,
  'Joint': 303,
  'Cohiba': 302,
  'Gold Teeth': 275,
  'Teeth': 248,
  'Pizza': 220,
  'Bubble Gum': 187,
  'Neckbeard': 184,
  'Pipe': 183,
  'Smile': 179,
  'Glossed Lips': 147,
  'Vampire Teeth': 146,
  'Stache': 138,
  'Bandana Mask': 106,
  'Copium Mask': 105,
  'Stunned': 90,
  'Hannibal Mask': 76,
  'Sexy Lip Bite': 59,
  // Face Wear values
  'No Face Wear': 9999,
  'MOG Glasses': 302,
  'Shades': 267,
  'Alpha Shades': 222,
  'Aviators': 194,
  'Matrix Lenses': 180,
  'Clown Nose': 180,
  '3D Glasses': 164,
  'Cool Glasses': 161,
  'Cyber Shades': 157,
  'Laser Eyes': 149,
  'Wizard Glasses': 145,
  'Ninja Turtle Mask': 143,
  'Eye Patch': 122,
  'Night Vision': 121,
  'Tyson Tattoo': 97,
  'VR Headset': 67,
  'Fake It Mask': 39,
  // G2-only (rare, always win consolidation)
  'Skull Mask': 0, 'MedievalBepe Cowboy': 0, 'MedievalBepe Emo': 0,
  'MedievalBepe Wizard': 0, 'Tanginium King': 0, 'Tanginium Sad': 0,
};

/**
 * Layer-aware overrides for keys that resolve to different Phase 1 values
 * depending on context. Key = "layerKey:rawIdLowercase", Value = correct Phase 1 name.
 */
const LAYER_OVERRIDES: Record<string, string> = {
  'Clothes:super saiyan': 'Super Saiyan Uniform',
  'Head:swat': 'SWAT Helmet',
};

/**
 * Extract the raw identifier from a file path or G2 virtual path,
 * then look it up in the TRAIT_NAME_MAP (with optional layer-aware override).
 */
function resolveTraitValue(filepath: string, layerKey?: string): { value: string; source: 'map' | 'fallback' } {
  let rawId: string;

  if (filepath.startsWith('/g2/')) {
    // G2 virtual path: /g2/Category/trait-name
    rawId = (filepath.split('/').pop() || '').replace(/[-_]/g, ' ').trim();
  } else {
    // G1 file path: use cleanDisplayName to get raw identifier
    rawId = cleanDisplayName(filepath);
  }

  // Check layer-aware override first
  if (layerKey) {
    const overrideKey = `${layerKey}:${rawId.toLowerCase().trim()}`;
    const override = LAYER_OVERRIDES[overrideKey];
    if (override) return { value: override, source: 'map' };
  }

  // Try direct map lookup
  const mapped = lookupTraitName(rawId);
  if (mapped) return { value: mapped, source: 'map' };

  // Fallback: programmatic formatting
  const display = formatDisplayLabel(rawId);
  return { value: display, source: 'fallback' };
}

export interface MetadataAttribute {
  trait_type: string;
  value: string;
  source: 'map' | 'fallback';
  raw: string;
  layerKey: string;
}

/** Hook to compute the 7 Phase 1 metadata attributes from current selections.
 *  Safe to call outside GeneratorProvider — returns [] when no context available. */
// AI category → CHIP-0007 trait_type mapping
const AI_CATEGORY_TO_TRAIT: Record<string, string> = {
  clothes: 'Clothes',
  head: 'Head',
  background: 'Background',
  facewear: 'Face Wear',
};

export function useMetadataAttributes(): MetadataAttribute[] {
  const ctx = useGeneratorOptional();
  const selectedLayers = ctx?.selectedLayers;
  const selectedColors = ctx?.selectedColors;
  const { aiTraitOverrides, isAIEnhancedMode } = useAIEnhance();

  return useMemo(() => {
    const selectedLayersMap = selectedLayers ?? {};
    const selectedColorsMap = selectedColors ?? {};

    // Collect all raw attributes from selected layers
    const rawAttrs: MetadataAttribute[] = [];

    for (const [key, value] of Object.entries(selectedLayersMap)) {
      if (isSelectionPathEmpty(value)) continue;

      const traitType = LAYER_TO_TRAIT_TYPE[key];
      if (!traitType) continue;

      // Solid-color backgrounds: resolve from the hex code, not the path
      // Price overlays take precedence over color name
      if (key === 'Background' && (value === '__solid__' || value?.includes('__solid__'))) {
        // Price Up / Price Down: show the overlay name
        if (value?.includes('__price_up__')) {
          rawAttrs.push({
            trait_type: 'Background',
            value: 'Price Up',
            source: 'map',
            raw: value,
            layerKey: key,
          });
          continue;
        }
        if (value?.includes('__price_down__')) {
          rawAttrs.push({
            trait_type: 'Background',
            value: 'Price Down',
            source: 'map',
            raw: value,
            layerKey: key,
          });
          continue;
        }
        // Plain solid color: resolve from hex
        const hex = selectedColorsMap.Background || SOLID_BG_DEFAULT_COLOR;
        const colorName = lookupBackgroundColorName(hex);
        rawAttrs.push({
          trait_type: 'Background',
          value: colorName || hex.toUpperCase(),
          source: colorName ? 'map' : 'fallback',
          raw: hex,
          layerKey: key,
        });
        continue;
      }

      const resolved = resolveTraitValue(value, key);
      rawAttrs.push({
        trait_type: traitType,
        value: resolved.value,
        source: resolved.source,
        raw: value,
        layerKey: key,
      });
    }

    // Separate extras (don't consolidate — can have up to 2)
    const extraAttrs: MetadataAttribute[] = [];
    const nonExtraAttrs: MetadataAttribute[] = [];
    for (const attr of rawAttrs) {
      if (attr.trait_type === 'Extra') {
        extraAttrs.push(attr);
      } else {
        nonExtraAttrs.push(attr);
      }
    }

    // Consolidate non-extras: when multiple layers map to the same trait_type,
    // keep the rarer trait (lower Phase 1 count wins). Unknown traits default to 0 (rarest).
    const byTraitType = new Map<string, MetadataAttribute>();
    for (const attr of nonExtraAttrs) {
      const existing = byTraitType.get(attr.trait_type);
      if (!existing) {
        byTraitType.set(attr.trait_type, attr);
      } else {
        const existingRarity = PHASE1_RARITY[existing.value] ?? 0;
        const newRarity = PHASE1_RARITY[attr.value] ?? 0;
        if (newRarity < existingRarity) {
          byTraitType.set(attr.trait_type, attr);
        }
      }
    }

    // Fixed entries: always present regardless of selection
    byTraitType.set('Base', {
      trait_type: 'Base',
      value: 'Wojak',
      source: 'map',
      raw: '(fixed)',
      layerKey: '_base',
    });
    if (!byTraitType.has('Head')) {
      byTraitType.set('Head', {
        trait_type: 'Head',
        value: 'No Headgear',
        source: 'map',
        raw: '(default)',
        layerKey: '_default',
      });
    }
    if (!byTraitType.has('Face Wear')) {
      byTraitType.set('Face Wear', {
        trait_type: 'Face Wear',
        value: 'No Face Wear',
        source: 'map',
        raw: '(default)',
        layerKey: '_default',
      });
    }

    // Always return all 7 core trait types in canonical order.
    // Background is the only trait that can be empty (grayed out until selected).
    const ORDER = ['Base', 'Face', 'Head', 'Face Wear', 'Mouth', 'Clothes', 'Background'];
    const result: MetadataAttribute[] = ORDER.map((traitType) => {
      const existing = byTraitType.get(traitType);
      if (existing) return existing;
      return {
        trait_type: traitType,
        value: '',
        source: 'map' as const,
        raw: '(empty)',
        layerKey: '_placeholder',
      };
    });

    // Append extras collapsed into a single row (comma-separated values)
    if (extraAttrs.length > 0) {
      result.push({
        trait_type: extraAttrs.length === 1 ? 'Extra' : 'Extras',
        value: extraAttrs.map(e => e.value).join(', '),
        source: extraAttrs.some(e => e.source === 'fallback') ? 'fallback' : 'map',
        raw: extraAttrs.map(e => e.raw).join(' | '),
        layerKey: 'Extra',
      });
    }

    // Apply AI trait overrides — replace values for AI-enhanced categories
    if (isAIEnhancedMode && aiTraitOverrides) {
      for (const [category, label] of Object.entries(aiTraitOverrides)) {
        const traitType = AI_CATEGORY_TO_TRAIT[category];
        if (!traitType || !label) continue;
        const attr = result.find(a => a.trait_type === traitType);
        if (attr) {
          attr.value = label;
          attr.source = 'map';
        }
      }
    }

    return result;
  }, [selectedLayers, selectedColors, isAIEnhancedMode, aiTraitOverrides]);
}

interface MetadataPreviewProps {
  onSwitchToColors: () => void;
}

export function MetadataPreview({ onSwitchToColors }: MetadataPreviewProps) {
  const attributes = useMetadataAttributes();

  const selectedCount = attributes.filter((a) => a.value !== '').length;
  const totalCount = attributes.length;

  return (
    <div className="generator-panel-section flex flex-col h-full overflow-hidden">
      {/* Header — matches color picker section label */}
      <div className="generator-panel-section-label flex items-center justify-between h-[14px] mb-[10px]">
        <div className="flex items-center gap-2">
          <span>Traits</span>
          <span
            className={`metadata-count-badge px-1.5 py-px rounded-sm${selectedCount >= 7 ? ' metadata-count-badge--complete' : ' metadata-count-badge--incomplete'}`}
          >
            {selectedCount}/{totalCount}
          </span>
        </div>
        <button
          type="button"
          className="metadata-switch-btn flex items-center gap-0.5 transition-colors text-accent"
          onClick={onSwitchToColors}
        >
          Colors
        </button>
      </div>

      {/* Attributes list — always shows all 7 trait types */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col gap-1.5">
          {attributes.map((attr, i) => {
            const isEmpty = attr.value === '';
            return (
              <div
                key={i}
                className={`metadata-attribute-row flex flex-col rounded-md${isEmpty ? ' metadata-attribute-row--empty' : ''}`}
              >
                <span className="metadata-attribute-label text-muted">
                  {attr.trait_type}
                </span>
                <span className={`metadata-attribute-value${isEmpty ? ' metadata-attribute-value--empty' : ''}`}>
                  {isEmpty ? '—' : attr.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
