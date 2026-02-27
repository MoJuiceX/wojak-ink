/**
 * usePrimarySlot — determines which fill slot the color picker edits
 *
 * Extracts the ternary chain that was previously inline in GeneratorRightPanel.
 * For multi-fill traits the active slot is chosen; for single-fill traits
 * the first user-pickable slot is used; special-case trait IDs get hard-coded fallbacks.
 */

import { useMemo } from 'react';
import { isUserPickableFill, getAllUserPickableFillSlots } from '@/lib/g2FillTreatments';
import type { UnifiedTrait } from '@/services/generatorService';
import type { G2Selection } from '@/types/generator';

/** Get the primary color slot key for a G2 trait (first user-pickable fill).
 * For layered traits (Viking helmet, 3D glasses) only considers slots that exist on the trait's layers,
 * so we don't pick fill0 when the trait only has fill1/fill2 (which would write to a slot the renderer never reads). */
export function getPrimaryColorSlot(trait: UnifiedTrait | null): string | null {
  if (!trait) return null;
  // Layered colorable: use only slots that exist on the trait (from layers), then first user-pickable
  if (trait.layers && trait.colorable) {
    const slots = getAllUserPickableFillSlots(trait.id, trait);
    return slots[0] ?? null;
  }
  if (trait.fillFile && isUserPickableFill(trait.id, 'fill')) return 'fill';
  if (trait.fill1File && isUserPickableFill(trait.id, 'fill1')) return 'fill1';
  if (trait.fillFiles) {
    for (let i = 0; i < trait.fillFiles.length; i++) {
      if (isUserPickableFill(trait.id, `fill${i}`)) return `fill${i}`;
    }
  }
  return null;
}

export function usePrimarySlot(
  g2Sel: G2Selection | undefined,
  allColorSlots: string[],
  g2Trait: UnifiedTrait | null,
  hasG2Selection: boolean,
): string | null {
  return useMemo(() => {
    if (!hasG2Selection) return null;

    if (g2Sel?.traitId === 'Clothes_Suit') {
      return g2Sel.activeColorSlot ?? 'fill0';
    }
    if (g2Sel?.traitId === 'Clothes_Chia-farmer') {
      return g2Sel.activeColorSlot ?? 'fill0';
    }
    if (allColorSlots.length > 1) {
      return g2Sel?.activeColorSlot && allColorSlots.includes(g2Sel.activeColorSlot)
        ? g2Sel.activeColorSlot
        : allColorSlots[0];
    }
    // Single or zero color slots — use helper or hard-coded fallbacks
    return (
      getPrimaryColorSlot(g2Trait) ??
      (g2Sel?.traitId === 'Clothes_Astronaut'
        ? 'fill'
        : g2Sel?.traitId === 'Clothes_Ninja-turtle-fit'
          ? 'fill0'
          : g2Sel?.traitId === 'Head_viking-helmet'
            ? 'fill1'
            : g2Sel?.traitId === 'Face-wear_3d-glases'
              ? 'fill1'
              : null)
    );
  }, [g2Sel, allColorSlots, g2Trait, hasG2Selection]);
}
