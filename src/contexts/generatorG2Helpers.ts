/**
 * G2 Helpers — shared color-building + G2Selection assembly
 *
 * Extracted from GeneratorContext.tsx where `buildG2Selection()` and
 * `selectG2Layer()` duplicated ~120 lines of identical fill-slot iteration,
 * special-case wiring, and centralized-default application.
 *
 * Both callers now delegate to `buildG2ColorsFromTrait()` and
 * `assembleG2Selection()` from this file.
 */

import type { G2Selection } from '@/types/generator';
import type { UnifiedTrait } from '@/services/generatorService';
import { isUserPickableFill, getAllUserPickableFillSlots } from '@/lib/g2FillTreatments';
import { G2_DEFAULT_COLORS, getG2DefaultColor } from '@/config/g2DefaultColors';

// ============ Color Building ============

/**
 * Build the initial G2 colors record from a trait's fill slots.
 *
 * Iterates fillFile / fill1File / fill2File / fillFiles / layers and populates
 * only user-pickable fills with default hex values.
 */
export function buildG2ColorsFromTrait(trait: UnifiedTrait): Record<string, string> {
  const colors: Record<string, string> = {};

  if (trait.fillFile && trait.defaultColor && isUserPickableFill(trait.id, 'fill')) {
    colors['fill'] = trait.defaultColor;
  }
  if (trait.fill1File && trait.defaultColor && isUserPickableFill(trait.id, 'fill1')) {
    colors['fill1'] = trait.defaultColor;
  }
  if (trait.fill2File && isUserPickableFill(trait.id, 'fill2')) {
    colors['fill2'] = trait.defaultColor2 || trait.defaultColor || '#FFFFFF';
  }
  if (trait.fillFiles && trait.defaultColors) {
    trait.fillFiles.forEach((_, i) => {
      const key = `fill${i}`;
      if (isUserPickableFill(trait.id, key)) {
        colors[key] = trait.defaultColors![i] || '#FFFFFF';
      }
    });
  }

  // Layered colorable (e.g. Ninja-turtle-fit, Viking helmet, Military jacket)
  if (trait.layers && trait.colorable && trait.defaultColors) {
    const layerKeyToFill: Record<string, string> = {
      mfill0: 'fill0', mfill1: 'fill1', mfill2: 'fill2', mfill3: 'fill3', mfill4: 'fill4',
      fill1: 'fill1', fill2: 'fill2',
    };
    for (const layer of trait.layers) {
      if (layer.type === 'fill' && layerKeyToFill[layer.key]) {
        const slot = layerKeyToFill[layer.key];
        if (isUserPickableFill(trait.id, slot)) {
          const twoFills = trait.defaultColors.length === 2 && (slot === 'fill1' || slot === 'fill2');
          const idx = twoFills
            ? (slot === 'fill1' ? 0 : 1)
            : (slot === 'fill0' ? 0 : slot === 'fill1' ? 1 : slot === 'fill2' ? 2 : slot === 'fill3' ? 3 : 4);
          colors[slot] = trait.defaultColors[idx] ?? trait.defaultColor ?? '#A0522D';
        }
      }
    }
  }

  // Special cases: ensure fill1 is always set so color picker and renderer have a value
  if (trait.id === 'Head_viking-helmet') {
    colors.fill1 = colors.fill1 ?? trait.defaultColors?.[0] ?? '#FF6B00';
  }
  if (trait.id === 'Face-wear_3d-glases') {
    colors.fill1 = colors.fill1 ?? trait.defaultColors?.[0] ?? getG2DefaultColor('Face-wear_3d-glases', 'fill1', trait, '#2563EB');
  }

  return colors;
}

// ============ G2Selection Assembly ============

/**
 * Assemble a complete G2Selection (colors + trait-specific options) for a trait.
 *
 * `initialColors` (if provided) override the defaults built by
 * `buildG2ColorsFromTrait` — used by randomize to inject random palette colors.
 */
export function assembleG2Selection(
  trait: UnifiedTrait,
  initialColors?: Record<string, string>,
): { virtualPath: string; g2: G2Selection } {
  const virtualPath = `/g2/${trait.category}/${trait.name.replace(/\s+/g, '-')}`;

  // Build default colors only for user-pickable fill slots
  const colors = buildG2ColorsFromTrait(trait);

  const g2: G2Selection = {
    traitId: trait.id,
    g2Category: trait.id.split('_')[0],
    colors: initialColors ? { ...colors, ...initialColors } : colors,
    detailOption: trait.detailOptions?.[0]?.file,
    ...(trait.id === 'Head_Cap' && {
      detailOption: undefined,
    }),
    ...(trait.id === 'Head_Construction-Helmet' && {
      detailOption: undefined,
      constructionHelmetChiaLogo: true,
      constructionHelmetCigPack: trait.detailOptions?.find(d => d.file.endsWith('cig-pack.png'))?.file ?? 'Head_Construction-Helmet_detail_cig-pack.png',
    }),
    ...(trait.id === 'Clothes_Suit' && {
      detailOption: trait.detailOptions?.[0]?.file,
      activeColorSlot: 'fill0' as const,
    }),
    ...(trait.id === 'Clothes_Astronaut' && {
      logoOption: 'CAT',
      flagOption: 'us',
    }),
    ...(trait.id === 'Clothes_Bepe-army' && {
      name1: '',
      name2: '',
    }),
    ...(trait.id === 'Clothes_Bepe-suit' && {
      suitVariant: 'bepe' as const,
    }),
    ...(trait.id === 'Clothes_Chia-farmer' && {
      chiaFarmerUnderlayer: 'tee' as const,
      activeColorSlot: 'fill0' as const,
    }),
    ...(trait.id === 'Clothes_Wizard-drip' && {
      detailOption: trait.detailOptions?.[0]?.file,
    }),
    ...(trait.id === 'Head_Beer-Hat' && {
      detailOption: trait.detailOptions?.find(d => d.name === 'Citrus')?.file ?? trait.detailOptions?.[0]?.file,
      beerHatEditFocus: 'underlayer' as const,
      beerHatUnderlayer: 'Head_Cap',
      beerHatUnderlayerG2: {
        traitId: 'Head_Cap',
        g2Category: 'Head',
        colors: { fill: G2_DEFAULT_COLORS['Head_Cap']?.fill ?? '#228B22' },
      },
    }),
    ...(trait.id === 'Face-wear_MOG-Glasses' && {
      detailOption: trait.detailOptions?.find(d => d.name === 'Default (Rainbow)')?.file ?? trait.detailOptions?.[0]?.file,
    }),
    ...(() => {
      const slots = getAllUserPickableFillSlots(trait.id, trait);
      return slots.length > 1 && trait.id !== 'Clothes_Suit' && trait.id !== 'Clothes_Chia-farmer'
        ? { activeColorSlot: slots[0] }
        : {};
    })(),
  };

  // Apply centralized defaults from g2DefaultColors
  const defaults = G2_DEFAULT_COLORS[trait.id];
  if (defaults) {
    for (const [slot, hex] of Object.entries(defaults)) {
      if (initialColors?.[slot] !== undefined) continue;
      g2.colors = { ...g2.colors, [slot]: hex };
    }
    if (trait.id === 'Clothes_Chia-farmer') delete g2.colors.fill;
  }
  // Fallback: use getG2DefaultColor for any user-pickable slot without initialColors
  if (trait.fillFile && g2.colors.fill === undefined && initialColors?.fill === undefined) {
    g2.colors.fill = getG2DefaultColor(trait.id, 'fill', trait, '#FFFFFF');
  }
  if (trait.fill1File && g2.colors.fill1 === undefined && initialColors?.fill1 === undefined) {
    g2.colors.fill1 = getG2DefaultColor(trait.id, 'fill1', trait, '#FFFFFF');
  }
  if (trait.fill2File && g2.colors.fill2 === undefined && initialColors?.fill2 === undefined) {
    g2.colors.fill2 = getG2DefaultColor(trait.id, 'fill2', trait, '#FFFFFF');
  }

  return { virtualPath, g2 };
}
