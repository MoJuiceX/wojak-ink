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
import { useGenerator } from '@/contexts/GeneratorContext';
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
};

/**
 * Layer-aware overrides for keys that resolve to different Phase 1 values
 * depending on context. Key = "layerKey:rawIdLowercase", Value = correct Phase 1 name.
 */
const LAYER_OVERRIDES: Record<string, string> = {
  'Clothes:super saiyan': 'Super Saiyan Uniform',
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

/** Hook to compute the 7 Phase 1 metadata attributes from current selections */
export function useMetadataAttributes(): MetadataAttribute[] {
  const { selectedLayers, selectedColors } = useGenerator();

  return useMemo(() => {
    // Collect all raw attributes from selected layers
    const rawAttrs: MetadataAttribute[] = [];

    for (const [key, value] of Object.entries(selectedLayers)) {
      if (isSelectionPathEmpty(value)) continue;

      const traitType = LAYER_TO_TRAIT_TYPE[key];
      if (!traitType) continue;

      // Solid-color backgrounds: resolve from the hex code, not the path
      if (key === 'Background' && (value === '__solid__' || value?.includes('__solid__'))) {
        const hex = selectedColors?.Background || '#1a1a2e';
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

    // Always include "Base: Wojak" as a fixed entry
    byTraitType.set('Base', {
      trait_type: 'Base',
      value: 'Wojak',
      source: 'map',
      raw: '(fixed)',
      layerKey: '_base',
    });

    // Sort in Phase 1 canonical order
    const ORDER = ['Background', 'Base', 'Clothes', 'Face', 'Face Wear', 'Head', 'Mouth'];
    const result = [...byTraitType.values()];
    result.sort((a, b) => {
      const ai = ORDER.indexOf(a.trait_type);
      const bi = ORDER.indexOf(b.trait_type);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    return result;
  }, [selectedLayers, selectedColors]);
}

interface MetadataPreviewProps {
  onSwitchToColors: () => void;
}

export function MetadataPreview({ onSwitchToColors }: MetadataPreviewProps) {
  const attributes = useMetadataAttributes();

  const traitCount = attributes.length;
  const hasUnmapped = attributes.some((a) => a.source === 'fallback');

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            Metadata
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: traitCount >= 7 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              color: traitCount >= 7 ? 'var(--color-success)' : 'var(--color-error)',
              fontSize: '10px',
            }}
          >
            {traitCount}/7
          </span>
          {hasUnmapped && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontSize: '10px' }}
            >
              unmapped
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="text-xs px-2 py-0.5 rounded"
            style={{ color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.05)' }}
            onClick={onSwitchToColors}
          >
            Colors
          </button>
        </div>
      </div>

      {/* Attributes list */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {attributes.length === 0 ? (
          <div className="text-xs p-2" style={{ color: 'var(--color-text-muted)' }}>
            Select traits to see metadata
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {attributes.map((attr, i) => (
              <div
                key={i}
                className="flex flex-col px-2 py-1.5 rounded"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: attr.source === 'fallback'
                    ? '1px solid rgba(251,191,36,0.3)'
                    : '1px solid transparent',
                }}
              >
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-cyan)', fontSize: '10px', fontWeight: 600 }}>
                    {attr.trait_type}
                  </span>
                  {attr.source === 'fallback' && (
                    <span style={{ color: '#fbbf24', fontSize: '9px' }}>not in map</span>
                  )}
                </div>
                <span style={{ color: 'var(--color-text)', fontSize: '12px' }}>
                  {attr.value}
                </span>
                {attr.raw !== '(fixed)' && (
                  <span
                    className="truncate"
                    style={{ color: 'var(--color-text-muted)', fontSize: '9px', fontFamily: 'monospace' }}
                    title={attr.raw}
                  >
                    {attr.raw.split('/').pop()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* JSON toggle */}
      <details className="px-1">
        <summary className="text-xs cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
          Full JSON
        </summary>
        <pre
          className="text-xs mt-1 p-2 rounded overflow-auto"
          style={{
            color: 'var(--color-text-secondary)',
            fontFamily: 'monospace',
            fontSize: '9px',
            whiteSpace: 'pre-wrap',
            backgroundColor: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--color-border)',
            maxHeight: '180px',
          }}
        >
          {JSON.stringify(
            {
              format: 'CHIP-0007',
              name: 'Your Wojak #[N]',
              compiler: 'Wojak.ink Generator',
              attributes: attributes.map(({ trait_type, value }) => ({ trait_type, value })),
              edition_number: '[N]',
              edition_total: 4200,
            },
            null,
            2
          )}
        </pre>
      </details>
    </div>
  );
}
