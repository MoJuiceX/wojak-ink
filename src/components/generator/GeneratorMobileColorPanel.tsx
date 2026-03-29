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
import { BeerHatUnderlayerPicker } from './BeerHatUnderlayerPicker';
import { KNOWN_TRAIT_IDS } from '@/lib/generatorTraitIds';
import { getG2DefaultColor } from '@/config/g2DefaultColors';
import type { G2Selection } from '@/types/generator';

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
  const rawG2Sel = g2Selections[activeLayer];
  const isBlocked = isLayerDisabled(activeLayer);

  // Beer Hat: swap g2Sel to underlayer when focus is 'underlayer' (same as desktop)
  const isBeerHat = activeLayer === 'Head' && rawG2Sel?.traitId === KNOWN_TRAIT_IDS.Head_BeerHat;
  const isBeerHatWithUnderlayerFocus =
    isBeerHat && rawG2Sel?.options.beerHatEditFocus === 'underlayer' && !!rawG2Sel?.options.beerHatUnderlayerG2;
  const g2Sel = isBeerHatWithUnderlayerFocus ? (rawG2Sel!.options.beerHatUnderlayerG2 as G2Selection) : rawG2Sel;

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
            compact
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
            compact
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
              (g2Sel?.options.suitVariant ?? 'bepe') === 'bepe' ? 'btn btn-primary' : 'btn btn-ghost'
            }`}
            onClick={() => setG2Detail(activeLayer, undefined, { suitVariant: 'bepe' })}
          >
            Bepe suit
          </button>
          <button
            type="button"
            className={`flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              g2Sel?.options.suitVariant === 'pepe' ? 'btn btn-primary' : 'btn btn-ghost'
            }`}
            onClick={() => setG2Detail(activeLayer, undefined, { suitVariant: 'pepe' })}
          >
            Pepe suit
          </button>
        </div>
      </div>
    ) : null;

  // Beer Hat: under layer picker (Cap, Viking, Centurion, etc.)
  const beerHatUnderlayerSection = isBeerHat ? (
    <BeerHatUnderlayerPicker
      selectedTraitId={rawG2Sel!.options.beerHatUnderlayer as string ?? KNOWN_TRAIT_IDS.Head_Cap}
      onSelect={(traitId) => {
        const defaultColors: Record<string, string> =
          traitId === KNOWN_TRAIT_IDS.Head_VikingHelmet
            ? { fill1: getG2DefaultColor(traitId, 'fill1', null, '#404040') }
            : traitId === KNOWN_TRAIT_IDS.Head_Cap
              ? { fill: getG2DefaultColor(traitId, 'fill', null, '#228B22') }
              : {};
        setG2Detail(activeLayer, undefined, {
          beerHatUnderlayer: traitId,
          beerHatUnderlayerG2: { traitId, g2Category: 'Head', colors: defaultColors, options: {} },
          beerHatEditFocus: 'underlayer',
        });
      }}
    />
  ) : null;

  // Beer Hat: dedicated color section for the underlayer — always visible when underlayer is colorable.
  // Bypasses the generic g2Sel swap and slot detection (which can miss on initial render)
  // and directly reads/writes the beerHatUnderlayerG2 colors.
  const beerHatColorSection: React.ReactNode = isBeerHat && rawG2Sel?.options.beerHatUnderlayerG2 ? (() => {
    const underlayerG2 = rawG2Sel.options.beerHatUnderlayerG2 as G2Selection;
    const underlayerTraitId = underlayerG2.traitId;

    // Known colorable underlayers with their fill slots
    let slot: string | null = null;
    let defColor: string | undefined;
    if (underlayerTraitId === KNOWN_TRAIT_IDS.Head_Cap) {
      slot = 'fill';
      defColor = getG2DefaultColor(underlayerTraitId, 'fill', null, '#228B22');
    } else if (underlayerTraitId === KNOWN_TRAIT_IDS.Head_VikingHelmet) {
      slot = 'fill1';
      defColor = getG2DefaultColor(underlayerTraitId, 'fill1', null, '#404040');
    } else {
      // Fallback: check unifiedTraits for other potentially colorable underlayers
      const underlayerTrait = unifiedTraits.find((t) => t.id === underlayerTraitId);
      if (underlayerTrait?.colorable) {
        slot = underlayerTrait.fillFile ? 'fill' : underlayerTrait.fill1File ? 'fill1' : null;
        defColor = underlayerTrait.defaultColor;
      }
    }

    if (!slot) return null;

    return (
      <div className="generator-panel-section">
        <div className="generator-panel-section-label">Color</div>
        <ColorPicker
          selectedColor={underlayerG2.colors?.[slot] || defColor || '#FFFFFF'}
          onColorChange={(color) => {
            const updated: G2Selection = { ...underlayerG2, colors: { ...underlayerG2.colors, [slot!]: color } };
            setG2Detail('Head', undefined, { beerHatUnderlayerG2: updated });
          }}
          defaultColor={defColor}
          compact
        />
      </div>
    );
  })() : null;

  if (!colorSection && !g2Sel && !suitStyleSection && !isBeerHat) return null;

  return (
    <div className="generator-options-mobile-panel">
      {isBeerHat ? beerHatColorSection : colorSection}
      {beerHatUnderlayerSection}
      {suitStyleSection}
      {isBeerHat ? (
        <>
          {/* Can options — always visible when Beer Hat is selected */}
          <G2TraitPanel
            onDetailSelect={(file, frameFile) => {
              setG2Detail('Head', undefined, { detail: file ?? '', frame: frameFile ?? '', beerHatEditFocus: 'beer' });
            }}
          />
          {rawG2Sel?.options.beerHatUnderlayerG2 && (
            /* Under layer details (Cap logos, Construction Helmet stickers, etc.) */
            <G2TraitPanel
              overrideG2Selection={rawG2Sel.options.beerHatUnderlayerG2 as G2Selection}
              onDetailSelect={(file, frameFile) => {
                const underG2 = rawG2Sel?.options.beerHatUnderlayerG2 as G2Selection | undefined;
                if (!underG2) return;
                const updated: G2Selection = { ...underG2, options: { ...underG2.options, detail: file ?? '', frame: frameFile ?? '', logo: file ? '' : underG2.options.logo } };
                setG2Detail('Head', undefined, { beerHatUnderlayerG2: updated });
              }}
              onLogoSelect={(logoName) => {
                const underG2 = rawG2Sel?.options.beerHatUnderlayerG2 as G2Selection | undefined;
                if (!underG2) return;
                const updated: G2Selection = { ...underG2, options: { ...underG2.options, logo: logoName, detail: logoName ? '' : underG2.options.detail } };
                setG2Detail('Head', undefined, { beerHatUnderlayerG2: updated });
              }}
              onVariantSelect={(variantFile) => {
                const underG2 = rawG2Sel?.options.beerHatUnderlayerG2 as G2Selection | undefined;
                if (!underG2) return;
                const updated: G2Selection = { ...underG2, options: { ...underG2.options, variant: variantFile } };
                setG2Detail('Head', undefined, { beerHatUnderlayerG2: updated });
              }}
              onConstructionHelmetUpdate={(chiaLogo, cigPack) => {
                const underG2 = rawG2Sel?.options.beerHatUnderlayerG2 as G2Selection | undefined;
                if (!underG2) return;
                const updated: G2Selection = { ...underG2, options: { ...underG2.options, constructionHelmetChiaLogo: chiaLogo, constructionHelmetCigPack: cigPack } };
                setG2Detail('Head', undefined, { beerHatUnderlayerG2: updated });
              }}
            />
          )}
        </>
      ) : (
        g2Sel && <G2TraitPanel />
      )}
    </div>
  );
}
