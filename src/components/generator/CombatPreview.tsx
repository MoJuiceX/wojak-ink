/**
 * CombatPreview — live combat identity preview in the generator
 *
 * Shows type, nature, ability as user selects traits + colors.
 * Uses calculateCombatIdentity() in a useMemo to recompute on every change.
 */

import { useMemo } from 'react';
import { useGenerator } from '@/contexts/GeneratorContext';
import { calculateCombatIdentity } from '@/lib/combat/identity-calculator';
import type { CombatType } from '@/lib/combat/types';

/** Map combat type to its badge CSS class */
function typeBadgeClass(type: CombatType): string {
  return `badge badge-${type.toLowerCase()}`;
}

export function CombatPreview() {
  const { selectedLayers, g2Selections } = useGenerator();

  const identity = useMemo(() => {
    // Build trait list from current selections
    const traits: { traitId: string; layer: string }[] = [];
    const colors: Record<string, string> = {};
    const details: Record<string, string> = {};

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
      }
    }

    // Also include G1 selections that have a path (maps to trait ID via path)
    if (selectedLayers) {
      for (const [layer, path] of Object.entries(selectedLayers)) {
        if (!path || typeof path !== 'string') continue;
        // G1 paths look like "/layers/Head/Hat/hat.png" — extract trait ID from path
        const parts = (path as string).split('/');
        if (parts.length >= 3) {
          const traitId = `${parts[parts.length - 2]}_${parts[parts.length - 1].replace(/\.[^.]+$/, '')}`;
          // Avoid duplicating G2 traits already added
          if (!traits.some(t => t.layer === layer)) {
            traits.push({ traitId, layer });
          }
        }
      }
    }

    if (traits.length === 0) return null;

    try {
      return calculateCombatIdentity({ traits, colors, details });
    } catch {
      return null;
    }
  }, [selectedLayers, g2Selections]);

  if (!identity) return null;

  // Find runner-up type (second highest score)
  const sortedTypes = Object.entries(identity.typeScores)
    .sort(([, a], [, b]) => b - a);
  const runnerUp = sortedTypes.length > 1 && sortedTypes[1][1] > 0
    ? sortedTypes[1][0] as CombatType
    : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={typeBadgeClass(identity.type)}>
          {identity.type}
        </span>
        {runnerUp && (
          <span className="text-muted text-xs">
            Runner-up: {runnerUp}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm text-secondary">
        <span>{identity.nature}</span>
        <span className="text-muted">|</span>
        <span>{identity.ability}</span>
      </div>
    </div>
  );
}
