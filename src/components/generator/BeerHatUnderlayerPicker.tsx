/**
 * BeerHatUnderlayerPicker — head trait selector for the Beer Hat under-layer
 *
 * Shows a grid of compatible head traits (Cap, Viking, etc.) that can
 * be worn underneath the Beer Hat cans.
 */

import { useState, useEffect } from 'react';
import { getUnifiedTraitById } from '@/services/generatorService';
import { BEER_HAT_COMPATIBLE_HEADS } from '@/lib/generatorTraitIds';
import type { UnifiedTrait } from '@/services/generatorService';
import { G2TraitCard } from './TraitSelector';

export interface BeerHatUnderlayerPickerProps {
  selectedTraitId: string;
  onSelect: (traitId: string) => void;
}

export function BeerHatUnderlayerPicker({ selectedTraitId, onSelect }: BeerHatUnderlayerPickerProps) {
  const [traits, setTraits] = useState<Map<string, UnifiedTrait>>(new Map());

  useEffect(() => {
    const load = async () => {
      const map = new Map<string, UnifiedTrait>();
      await Promise.all(
        BEER_HAT_COMPATIBLE_HEADS.map(async (id) => {
          const t = await getUnifiedTraitById(id);
          if (t) map.set(id, t);
        })
      );
      setTraits(map);
    };
    load();
  }, []);

  return (
    <div className="generator-panel-section flex-shrink-0">
      <div className="generator-panel-section-label">Under layer</div>
      <div className="grid grid-cols-3 gap-2">
        {BEER_HAT_COMPATIBLE_HEADS.map((traitId) => {
          const trait = traits.get(traitId);
          const isSelected = selectedTraitId === traitId;
          if (!trait) {
            return (
              <div key={traitId} className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--color-surface)' }}>
                <span className="text-xs text-muted">…</span>
              </div>
            );
          }
          return (
            <div key={traitId} className="w-16 h-16 flex-shrink-0">
              <G2TraitCard
                trait={trait}
                isSelected={isSelected}
                onClick={() => onSelect(traitId)}
                needsClothesUnderlay
                hideCheckBadge
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
