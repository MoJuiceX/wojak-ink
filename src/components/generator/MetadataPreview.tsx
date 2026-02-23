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

import { useMemo } from 'react';
import { useGeneratorOptional } from '@/contexts/GeneratorContext';
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
export function useMetadataAttributes(): MetadataAttribute[] {
  const ctx = useGeneratorOptional();
  const selectedLayers = ctx?.selectedLayers;
  const selectedColors = ctx?.selectedColors;

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

    // Consolidate: when multiple layers map to the same trait_type,
    // keep the rarer trait (lower Phase 1 count wins). Unknown traits default to 0 (rarest).
    const byTraitType = new Map<string, MetadataAttribute>();
    for (const attr of rawAttrs) {
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

    // Always return all 7 trait types in canonical order.
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

    return result;
  }, [selectedLayers, selectedColors]);
}

interface MetadataPreviewProps {
  onSwitchToColors: () => void;
}

export function MetadataPreview({ onSwitchToColors }: MetadataPreviewProps) {
  const attributes = useMetadataAttributes();

  const selectedCount = attributes.filter((a) => a.value !== '').length;

  return (
    <div className="generator-panel-section flex flex-col h-full overflow-hidden">
      {/* Header — matches color picker section label */}
      <div className="generator-panel-section-label flex items-center justify-between" style={{ height: '14px', marginBottom: 10 }}>
        <div className="flex items-center gap-2">
          <span>Traits</span>
          <span
            className="px-1.5 py-px rounded-sm"
            style={{
              background: selectedCount >= 7 ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
              color: selectedCount >= 7 ? 'var(--color-success)' : 'var(--color-text-muted)',
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.03em',
            }}
          >
            {selectedCount}/7
          </span>
        </div>
        <button
          type="button"
          className="flex items-center gap-0.5 transition-colors text-accent"
          style={{
            fontSize: '0.5625rem',
            fontWeight: 600,
            lineHeight: 1,
            cursor: 'pointer',
          }}
          onClick={onSwitchToColors}
        >
          Colors
        </button>
      </div>

      {/* Attributes list — always shows all 7 trait types */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <div className="flex flex-col gap-1.5">
          {attributes.map((attr, i) => {
            const isEmpty = attr.value === '';
            return (
              <div
                key={i}
                className="flex flex-col rounded-md"
                style={{
                  padding: '6px 8px',
                  background: isEmpty ? 'transparent' : 'rgba(255, 255, 255, 0.025)',
                  border: isEmpty ? '1px solid rgba(255, 255, 255, 0.03)' : '1px solid var(--color-white-5)',
                  opacity: isEmpty ? 0.3 : 1,
                }}
              >
                <span
                  className="text-muted"
                  style={{
                    fontSize: '9px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 1,
                  }}
                >
                  {attr.trait_type}
                </span>
                <span style={{
                  color: isEmpty ? 'var(--color-text-muted)' : 'var(--color-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                }}>
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
