/**
 * GeneratorMobileColorPanel
 *
 * On mobile only: a dedicated box below the trait grid that shows the color picker
 * and G2 customization panel so they are always visible (not buried under scroll).
 * Uses the same logic as TraitSelector's inline color/G2 block.
 */

import React, { useState, useEffect } from 'react';
import { useLayout } from '@/hooks/useLayout';
import { useGenerator } from '@/contexts/GeneratorContext';
import { ColorPicker } from './ColorPicker';
import { G2TraitPanel } from './G2TraitPanel';
import type { UnifiedTrait } from '@/services/generatorService';

const SOLID_BG_DEFAULT_COLOR = '#38BDF8';

export function GeneratorMobileColorPanel() {
  const { isDesktop } = useLayout();
  const {
    activeLayer,
    selectedLayers,
    selectedColors,
    g2Selections,
    setColor,
    setG2Color,
    setG2Detail,
    getUnifiedTraitsForLayer,
    isLayerDisabled,
  } = useGenerator();

  const [unifiedTraits, setUnifiedTraits] = useState<UnifiedTrait[]>([]);

  useEffect(() => {
    if (!activeLayer) return;
    getUnifiedTraitsForLayer(activeLayer)
      .then(setUnifiedTraits)
      .catch(() => setUnifiedTraits([]));
  }, [activeLayer, getUnifiedTraitsForLayer]);

  if (isDesktop) return null;

  const selectedPath = selectedLayers[activeLayer];
  const g2Sel = g2Selections[activeLayer];
  const isBlocked = isLayerDisabled(activeLayer);

  if (isBlocked || (!selectedPath && !g2Sel)) return null;

  const colorSection: React.ReactNode =
    g2Sel ? (() => {
      const g2Trait = unifiedTraits.find((t) => t.id === g2Sel.traitId);
      const slot = g2Trait?.id === 'Clothes_Suit'
        ? (g2Sel?.activeColorSlot ?? 'fill0')
        : (g2Trait?.fillFile ? 'fill' : g2Trait?.fill1File ? 'fill1' : g2Trait?.fillFiles ? 'fill0' : (g2Trait?.layers && g2Trait?.colorable ? 'fill0' : null));
      if (!g2Trait?.colorable || !slot) return null;
      const defColor = g2Sel.traitId === 'Clothes_Suit' && g2Trait?.defaultColors
        ? (slot === 'fill0' ? g2Trait.defaultColors[0] : g2Trait.defaultColors[1])
        : (g2Trait?.defaultColor || (g2Sel.traitId === 'Clothes_Astronaut' ? '#FFFFFF' : undefined));
      return (
        <div className="generator-panel-section">
          <div className="generator-panel-section-label">Color</div>
          <ColorPicker
            selectedColor={g2Sel.colors?.[slot ?? 'fill'] || '#FFFFFF'}
            onColorChange={(color) => setG2Color(activeLayer, slot, color)}
            defaultColor={defColor}
          />
        </div>
      );
    })()
    : (() => {
      const isBgSolid = activeLayer === 'Background' && (selectedPath === '__solid__' || selectedPath?.includes('__solid__'));
      const isG1Colorable = (['Clothes', 'Head', 'Eyes'] as string[]).includes(activeLayer) || isBgSolid;
      if (!isG1Colorable) return null;
      return (
        <div className="generator-panel-section">
          <div className="generator-panel-section-label">Color</div>
          <ColorPicker
            selectedColor={selectedColors?.[activeLayer] || (isBgSolid ? SOLID_BG_DEFAULT_COLOR : '#FFFFFF')}
            onColorChange={(color) => setColor(activeLayer, color)}
            defaultColor={isBgSolid ? SOLID_BG_DEFAULT_COLOR : undefined}
          />
        </div>
      );
    })();

  const isBepeSuit = g2Sel?.traitId === 'Clothes_Bepe-suit';
  const suitStyleSection: React.ReactNode =
    isBepeSuit && activeLayer === 'Clothes' ? (
      <div className="generator-panel-section flex-shrink-0">
        <div className="generator-panel-section-label">Suit style</div>
        <div className="flex gap-2">
          <button
            type="button"
            className={`flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              (g2Sel?.suitVariant ?? 'bepe') === 'bepe' ? 'btn btn-primary' : 'btn btn-ghost'
            }`}
            onClick={() => setG2Detail(activeLayer, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'bepe')}
          >
            Bepe suit
          </button>
          <button
            type="button"
            className={`flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              g2Sel?.suitVariant === 'pepe' ? 'btn btn-primary' : 'btn btn-ghost'
            }`}
            onClick={() => setG2Detail(activeLayer, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'pepe')}
          >
            Pepe suit
          </button>
        </div>
      </div>
    ) : null;

  if (!colorSection && !g2Sel && !suitStyleSection) return null;

  return (
    <div className="generator-options-mobile-panel">
      {colorSection}
      {suitStyleSection}
      {g2Sel && <G2TraitPanel />}
    </div>
  );
}
