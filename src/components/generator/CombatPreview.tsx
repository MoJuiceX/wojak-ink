/**
 * CombatPreview — live combat identity preview in the generator
 *
 * Shows type emoji, type name, and nature as user selects traits + colors.
 * Updates in real-time as selections change.
 */

import { useMemo } from 'react';
import { useGenerator } from '@/contexts/GeneratorContext';
import { calculateCombatIdentity } from '@/lib/combat/identity-calculator';
import type { CombatType } from '@/lib/combat/types';

/**
 * Type emoji mapping - each type gets a distinctive emoji
 */
const TYPE_EMOJI: Record<CombatType, string> = {
  NEUTRAL: '⚪',
  FIRE: '🔥',
  WATER: '💧',
  ELECTRIC: '⚡',
  GRASS: '🌿',
  ICE: '❄️',
  MARTIAL: '🥊',
  VENOM: '☠️',
  EARTH: '🏔️',
  AIR: '🌪️',
  PSYCHE: '🔮',
  INSECT: '🐛',
  STONE: '🪨',
  GHOST: '👻',
  DRAGON: '🐉',
  SHADOW: '🌑',
  METAL: '⚙️',
  MYSTIC: '✨',
};

/**
 * Type display names - title case for UI
 */
const TYPE_NAME: Record<CombatType, string> = {
  NEUTRAL: 'Neutral',
  FIRE: 'Fire',
  WATER: 'Water',
  ELECTRIC: 'Electric',
  GRASS: 'Grass',
  ICE: 'Ice',
  MARTIAL: 'Martial',
  VENOM: 'Venom',
  EARTH: 'Earth',
  AIR: 'Air',
  PSYCHE: 'Psyche',
  INSECT: 'Insect',
  STONE: 'Stone',
  GHOST: 'Ghost',
  DRAGON: 'Dragon',
  SHADOW: 'Shadow',
  METAL: 'Metal',
  MYSTIC: 'Mystic',
};

export function CombatPreview() {
  const { selectedLayers, selectedColors, g2Selections } = useGenerator();

  const identity = useMemo(() => {
    // Build trait list from current selections
    const traits: { traitId: string; layer: string }[] = [];
    const colors: Record<string, string> = {};
    const details: Record<string, string> = {};
    let logoOption: string | undefined;

    // Gather G2 selections (these carry traitId, colors, details)
    if (g2Selections) {
      for (const [layer, sel] of Object.entries(g2Selections)) {
        if (!sel?.traitId) continue;
        traits.push({ traitId: sel.traitId, layer });

        // Collect colors from this selection
        if (sel.colors) {
          for (const hex of Object.values(sel.colors)) {
            if (hex) colors[sel.traitId] = hex;
          }
        }

        // Collect detail option
        if (sel.detailOption) {
          details[sel.traitId] = sel.detailOption;
        }

        // Collect logo option (Astronaut coin logo)
        if (sel.logoOption) {
          logoOption = sel.logoOption;
        }
      }
    }

    // Also include G1 selections that have a path (maps to trait ID via path)
    if (selectedLayers) {
      for (const [layer, path] of Object.entries(selectedLayers)) {
        if (!path || typeof path !== 'string') continue;
        if (path === '__solid__') continue;

        // G1 paths look like "/layers/Head/Hat/hat.png" — extract trait ID
        const parts = (path as string).split('/');
        if (parts.length >= 2) {
          // Get last two meaningful parts (layer folder + filename)
          const filename = parts[parts.length - 1].replace(/\.[^.]+$/, '');
          const layerFolder = parts[parts.length - 2];
          const traitId = `${layerFolder}_${filename}`;

          // Avoid duplicating G2 traits already added
          if (!traits.some(t => t.layer === layer)) {
            traits.push({ traitId, layer });

            // Add color if this layer has a selected color
            const layerColor = (selectedColors as Record<string, string | undefined>)?.[layer];
            if (layerColor) {
              colors[traitId] = layerColor;
            }
          }
        }
      }
    }

    if (traits.length === 0) return null;

    try {
      return calculateCombatIdentity({ traits, colors, details, logoOption });
    } catch {
      return null;
    }
  }, [selectedLayers, selectedColors, g2Selections]);

  // Empty state
  if (!identity) {
    return (
      <div
        className="flex items-center gap-3"
        style={{
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.04)',
        }}
      >
        <span style={{ fontSize: '20px', opacity: 0.3 }}>⚪</span>
        <div className="flex flex-col">
          <span
            style={{
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              fontWeight: 500,
            }}
          >
            Select traits...
          </span>
        </div>
      </div>
    );
  }

  const emoji = TYPE_EMOJI[identity.type];
  const typeName = TYPE_NAME[identity.type];

  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: '8px 12px',
        background: 'rgba(255, 255, 255, 0.04)',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <span style={{ fontSize: '24px' }}>{emoji}</span>
      <div className="flex flex-col">
        <span
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--color-primary)',
            lineHeight: 1.2,
          }}
        >
          {typeName}
        </span>
        <span
          style={{
            fontSize: '11px',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.3,
          }}
        >
          {identity.nature}
        </span>
      </div>
    </div>
  );
}
