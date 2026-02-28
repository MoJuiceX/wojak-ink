/**
 * Generator Right Panel (desktop)
 *
 * Renders in the right column: color picker always at top (same position for G1 and G2),
 * then G2 details (coin logos, etc.) below when applicable.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Copy, Check } from 'lucide-react';
import { useGenerator } from '@/contexts/GeneratorContext';
import { ColorPicker } from './ColorPicker';
import { G2TraitPanel } from './G2TraitPanel';
import { getUnifiedTraitById, getPathToTraitIdMap } from '@/services/generatorService';
import { isSelectionPathEmpty, type G2Selection } from '@/types/generator';
import { getAllUserPickableFillSlots } from '@/lib/g2FillTreatments';
import { getG2DefaultColor } from '@/config/g2DefaultColors';
import type { UILayerName } from '@/lib/wojakRules';
import type { UnifiedTrait } from '@/services/generatorService';

import { MilitaryBeretSwatches } from './MilitaryBeretSwatches';
import { MaskVariantPicker } from './MaskVariantPicker';
import { isFullFaceMaskSelected } from './maskData';
import { BeerHatUnderlayerPicker } from './BeerHatUnderlayerPicker';
import { usePrimarySlot } from '@/hooks/usePrimarySlot';
import { KNOWN_TRAIT_IDS } from '@/lib/generatorTraitIds';

/** Layers where G1 traits can be colored (Base, Mouth, etc. cannot) */
const LAYERS_WITH_G1_COLOR: UILayerName[] = ['Clothes', 'Head', 'Eyes'];

/** Background uses color picker only when "Solid color" is selected */
const isBackgroundSolidColor = (path: string | undefined) =>
  path === '__solid__' || path?.includes('__solid__');

/** Default color for solid color backgrounds - sky blue */
const SOLID_BG_DEFAULT_COLOR = '#38BDF8';

export function GeneratorRightPanel() {
  const { activeLayer, selectedLayers, g2Selections, selectedColors, setColor, setG2Color, setG2Detail, selectLayer, selectG2Layer, isInitialized } = useGenerator();
  const setChiaFarmerDetail = (activeColorSlot?: 'fill0' | 'fill1', chiaFarmerUnderlayer?: 'tee' | 'tanktop') => {
    setG2Detail(activeLayer, activeColorSlot, chiaFarmerUnderlayer ? { chiaFarmerUnderlayer } : undefined);
  };
  const [g2Trait, setG2Trait] = useState<UnifiedTrait | null>(null);
  const [militaryBeretTrait, setMilitaryBeretTrait] = useState<UnifiedTrait | null>(null);

  const hasSelection = !!(selectedLayers[activeLayer] || g2Selections[activeLayer]);
  const hasG2Selection = !!g2Selections[activeLayer];
  let g2Sel = g2Selections[activeLayer];
  const isBeerHatWithUnderlayerFocus =
    activeLayer === 'Head' &&
    g2Sel?.traitId === KNOWN_TRAIT_IDS.Head_BeerHat &&
    g2Sel.options.beerHatEditFocus === 'underlayer' &&
    g2Sel.options.beerHatUnderlayerG2;
  if (isBeerHatWithUnderlayerFocus && g2Sel) {
    g2Sel = g2Sel.options.beerHatUnderlayerG2 as G2Selection;
  }

  const isG1MilitaryBeret =
    activeLayer === 'Head' &&
    selectedLayers.Head?.includes('Military-Beret') &&
    !g2Selections.Head;

  useEffect(() => {
    if (!g2Sel?.traitId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setG2Trait(null);
      return;
    }
    getUnifiedTraitById(g2Sel.traitId).then(setG2Trait).catch(() => setG2Trait(null));
  }, [g2Sel?.traitId]);

  useEffect(() => {
    if (isG1MilitaryBeret) {
      getUnifiedTraitById(KNOWN_TRAIT_IDS.Head_MilitaryBeret).then(setMilitaryBeretTrait).catch(() => setMilitaryBeretTrait(null));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMilitaryBeretTrait(null);
    }
  }, [isG1MilitaryBeret]);

  // Hydrate G2 for Head when path resolves to a G2 colorable trait (e.g. Viking) but g2 is missing (e.g. from randomize or favorite).
  // Run regardless of activeLayer so Viking helmet (and other G2 Head traits) get color picker without requiring the user to click Head tab first.
  useEffect(() => {
    const path = selectedLayers.Head;
    if (!path || isSelectionPathEmpty(path)) return;
    const pathMap = getPathToTraitIdMap();
    const resolvedTraitId = pathMap.get(path);
    if (!resolvedTraitId) return;
    const currentG2TraitId = g2Selections.Head?.traitId;
    if (currentG2TraitId === resolvedTraitId) return; // already have correct G2
    getUnifiedTraitById(resolvedTraitId).then((trait) => {
      if (!trait || !(trait.colorable || (trait.detailOptions && trait.detailOptions.length > 0))) return;
      if (trait.source !== 'g2' && trait.source !== 'both') return;
      selectG2Layer('Head', trait);
    }).catch(() => {});
  }, [isInitialized, selectedLayers.Head, g2Selections.Head?.traitId, selectG2Layer]);

  // Hydrate G2 for Eyes when path resolves to a G2 colorable trait (e.g. 3D glasses) but g2 is missing (e.g. from randomize or favorite).
  // Run regardless of activeLayer so 3D glasses (and other G2 Eyes traits) get color picker without requiring the user to click Eyes tab first.
  useEffect(() => {
    const path = selectedLayers.Eyes;
    if (!path || isSelectionPathEmpty(path)) return;
    const pathMap = getPathToTraitIdMap();
    const resolvedTraitId = pathMap.get(path);
    if (!resolvedTraitId) return;
    const currentG2TraitId = g2Selections.Eyes?.traitId;
    if (currentG2TraitId === resolvedTraitId) return; // already have correct G2
    getUnifiedTraitById(resolvedTraitId).then((trait) => {
      if (!trait || !(trait.colorable || (trait.detailOptions && trait.detailOptions.length > 0))) return;
      if (trait.source !== 'g2' && trait.source !== 'both') return;
      selectG2Layer('Eyes', trait);
    }).catch(() => {});
  }, [isInitialized, selectedLayers.Eyes, g2Selections.Eyes?.traitId, selectG2Layer]);

  // All user-pickable fill slots for this trait (needed before primarySlot)
  const rawColorSlots = hasG2Selection && g2Trait
    ? getAllUserPickableFillSlots(g2Sel!.traitId, g2Trait)
    : [];
  // Viking helmet, 3D glasses: use layers (fill1/fill2); ensure fill1 when rawColorSlots empty so color picker works
  const allColorSlots =
    (g2Sel?.traitId === KNOWN_TRAIT_IDS.Head_VikingHelmet || g2Sel?.traitId === KNOWN_TRAIT_IDS.Facewear_3dGlasses) && rawColorSlots.length === 0
      ? ['fill1']
      : rawColorSlots;

  // Color picker always in same position; controls G1 layer color or G2 trait color.
  // For multi-fill traits: activeColorSlot selects which fill the picker edits; else first slot.
  const primarySlot = usePrimarySlot(g2Sel, allColorSlots, g2Trait, hasG2Selection);
  const isG2Colorable = hasG2Selection && (!!g2Trait?.colorable || g2Sel?.traitId === KNOWN_TRAIT_IDS.Clothes_Astronaut || g2Sel?.traitId === KNOWN_TRAIT_IDS.Clothes_ChiaFarmer || g2Sel?.traitId === KNOWN_TRAIT_IDS.Head_VikingHelmet || g2Sel?.traitId === KNOWN_TRAIT_IDS.Facewear_3dGlasses) && primarySlot !== null;
  const isG1Colorable =
    !hasG2Selection &&
    (LAYERS_WITH_G1_COLOR.includes(activeLayer) ||
      (activeLayer === 'Background' && isBackgroundSolidColor(selectedLayers.Background)));

  const defaultColorForSlot = (slot: string, index: number): string => {
    if (!g2Trait || !g2Sel) return '#FFFFFF';
    return getG2DefaultColor(g2Sel.traitId, slot, g2Trait, g2Trait.defaultColors?.[index] ?? g2Trait.defaultColor2 ?? g2Trait.defaultColor ?? '#FFFFFF');
  };
  const slotIndex = primarySlot ? allColorSlots.indexOf(primarySlot) : -1;
  const defaultColor =
    g2Sel?.traitId === KNOWN_TRAIT_IDS.Clothes_Suit && g2Trait?.defaultColors
      ? (primarySlot === 'fill0' ? g2Trait.defaultColors[0] : g2Trait.defaultColors[1])
      : g2Sel?.traitId === KNOWN_TRAIT_IDS.Head_VikingHelmet
        ? (g2Trait?.defaultColors?.[0] ?? g2Sel?.colors?.fill1 ?? '#FF6B00')
        : g2Sel?.traitId === KNOWN_TRAIT_IDS.Clothes_ChiaFarmer
          ? getG2DefaultColor(g2Sel.traitId, primarySlot === 'fill0' ? 'fill0' : 'fill1', g2Trait ?? null, '#FFFFFF')
          : primarySlot && allColorSlots.length > 0
            ? defaultColorForSlot(primarySlot, slotIndex >= 0 ? slotIndex : 0)
            : (g2Trait?.defaultColor || (g2Sel?.traitId === KNOWN_TRAIT_IDS.Clothes_Astronaut ? '#FFFFFF' : undefined));

  const isMilitaryBeretG2 = g2Sel?.traitId === KNOWN_TRAIT_IDS.Head_MilitaryBeret;

  const colorPickerProps = hasG2Selection
    ? {
        selectedColor: g2Sel?.colors?.[primarySlot ?? 'fill1'] || '#FFFFFF',
        onColorChange: (color: string) => primarySlot && setG2Color(activeLayer, primarySlot, color),
        disabled: !isG2Colorable,
        defaultColor: isG2Colorable ? defaultColor : undefined,
        onReset: isMilitaryBeretG2 && g2Trait?.g1Path
          ? () => selectLayer('Head', g2Trait.g1Path!)
          : g2Sel?.traitId === KNOWN_TRAIT_IDS.Head_Cap
            ? () => {
                if (primarySlot) setG2Color(activeLayer, primarySlot, defaultColor ?? '#228B22');
                setG2Detail(activeLayer, '');
              }
            : undefined,
      }
    : {
        selectedColor:
          activeLayer === 'Background' && isBackgroundSolidColor(selectedLayers.Background)
            ? (selectedColors?.[activeLayer] || SOLID_BG_DEFAULT_COLOR)
            : (selectedColors?.[activeLayer] || '#FFFFFF'),
        onColorChange: (color: string) => setColor(activeLayer, color),
        disabled: !isG1Colorable,
        defaultColor:
          activeLayer === 'Background' && isBackgroundSolidColor(selectedLayers.Background)
            ? SOLID_BG_DEFAULT_COLOR
            : undefined,
      };

  const hexDisplayRef = useRef('');
  const [hexDisplay, setHexDisplay] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  const handleHexDisplay = useCallback((hex: string) => {
    if (hex !== hexDisplayRef.current) {
      hexDisplayRef.current = hex;
      setHexDisplay(hex);
    }
  }, []);

  const copyHexToClipboard = useCallback(() => {
    if (!hexDisplay) return;
    navigator.clipboard.writeText(hexDisplay).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 1500);
    });
  }, [hexDisplay]);

  return (
    <div
      className="generator-right-panel flex flex-col gap-3 overflow-y-auto"
      style={{
        padding: '12px',
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(255, 255, 255, 0.015)',
        border: '1px solid var(--color-white-5)',
        maxHeight: '100%',
      }}
    >
      {/* G1 Military Beret: "Pick a color to use new design" — swatches switch to G2 */}
      {isG1MilitaryBeret && (
        <div className="generator-panel-section flex-shrink-0">
          <div className="generator-panel-section-label">Pick a color to use new design</div>
          <MilitaryBeretSwatches
            onColorPick={(color) => militaryBeretTrait && selectG2Layer(activeLayer, militaryBeretTrait, { fill: color })}
            disabled={!militaryBeretTrait}
          />
        </div>
      )}
      {/* Single color palette — hidden for full-face masks (no colorable parts) */}
      {!isG1MilitaryBeret && !(activeLayer === 'Mask' && isFullFaceMaskSelected(selectedLayers.Mask)) && (
        <div className="flex-shrink-0" style={{ overflow: 'visible' }}>
          <div className="flex items-center justify-between mb-1.5" style={{ height: '14px', overflow: 'visible' }}>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">Color</span>
            {/* Reset button — inline, no vertical padding so it doesn't change row height */}
            {(colorPickerProps.defaultColor || colorPickerProps.onReset) && (() => {
              const norm = (h: string) => (h.startsWith('#') ? h : '#' + h).toUpperCase();
              const isAtDefault = colorPickerProps.defaultColor
                ? norm(colorPickerProps.selectedColor) === norm(colorPickerProps.defaultColor)
                : false;
              return (
                <button
                  type="button"
                  className="flex items-center gap-0.5 transition-colors"
                  style={{
                    color: isAtDefault ? 'var(--color-text-muted)' : 'var(--color-primary)',
                    opacity: isAtDefault ? 0.4 : 1,
                    cursor: isAtDefault || colorPickerProps.disabled ? 'default' : 'pointer',
                    fontSize: '0.5625rem',
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                  onClick={() => {
                    if (isAtDefault || colorPickerProps.disabled) return;
                    if (colorPickerProps.onReset) colorPickerProps.onReset();
                    else if (colorPickerProps.defaultColor) colorPickerProps.onColorChange(colorPickerProps.defaultColor);
                  }}
                  disabled={isAtDefault || colorPickerProps.disabled}
                  title={colorPickerProps.onReset ? 'Use original design' : 'Reset to default color'}
                >
                  <RotateCcw size={8} />
                  <span>{colorPickerProps.onReset ? 'Original' : 'Reset'}</span>
                </button>
              );
            })()}
            {hexDisplay && (
              <button
                type="button"
                onClick={copyHexToClipboard}
                className="flex items-center gap-1 font-mono text-[10px] text-secondary hover:text-white transition-colors cursor-pointer"
                title="Copy to clipboard"
              >
                {hexDisplay}
                {showCopied ? (
                  <Check size={10} className="text-success" />
                ) : (
                  <Copy size={10} />
                )}
              </button>
            )}
          </div>
          <ColorPicker
            {...colorPickerProps}
            onHexDisplay={handleHexDisplay}
          />
        </div>
      )}
      {/* Mask layer: show variant face masks when any full-face mask style is selected */}
      {activeLayer === 'Mask' && isFullFaceMaskSelected(selectedLayers.Mask) && (
        <MaskVariantPicker
          selectedPath={selectedLayers.Mask}
          onSelect={(path) => selectLayer('Mask', path)}
        />
      )}

      {/* Fill-target buttons: which part the color picker edits (for multi-fill traits except Suit/Chia Farmer) */}
      {hasSelection &&
        hasG2Selection &&
        allColorSlots.length > 1 &&
        g2Sel?.traitId !== KNOWN_TRAIT_IDS.Clothes_Suit &&
        g2Sel?.traitId !== KNOWN_TRAIT_IDS.Clothes_ChiaFarmer && (
          <div className="generator-panel-section flex-shrink-0">
            <div className="generator-panel-section-label">Color Part</div>
            <div className="flex flex-wrap gap-2">
              {allColorSlots.map((slot, index) => {
                const label = allColorSlots.length === 1 ? 'Fill' : `Fill ${index + 1}`;
                const isActive = primarySlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    className={`flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'btn btn-primary' : 'btn btn-ghost'
                    }`}
                    onClick={() => {
                      // Comrad Hat: clicking star fill (fill3) clears coin logo so the star reappears
                      const clearLogo = g2Sel?.traitId === KNOWN_TRAIT_IDS.Head_ComradHat && slot === 'fill3' ? '' : undefined;
                      setG2Detail(activeLayer, slot, clearLogo !== undefined ? { logo: clearLogo } : undefined);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      {/* Beer Hat: under layer picker — select which head goes under the cans */}
      {activeLayer === 'Head' && g2Selections.Head?.traitId === KNOWN_TRAIT_IDS.Head_BeerHat && (
        <BeerHatUnderlayerPicker
          selectedTraitId={g2Selections.Head?.options.beerHatUnderlayer as string ?? KNOWN_TRAIT_IDS.Head_Cap}
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
      )}

      {/* Bepe suit: toggle Bepe / Pepe variant (under color picker) */}
      {hasSelection && hasG2Selection && g2Sel?.traitId === KNOWN_TRAIT_IDS.Clothes_BepeSuit && (
        <div className="generator-panel-section flex-shrink-0">
          <div className="generator-panel-section-label">Suit style</div>
          <div className="flex gap-2">
            <button
              type="button"
              className={`flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                ((g2Sel.options.suitVariant as string | undefined) ?? 'bepe') === 'bepe'
                  ? 'btn btn-primary'
                  : 'btn btn-ghost'
              }`}
              onClick={() => setG2Detail(activeLayer, undefined, { suitVariant: 'bepe' })}
            >
              Bepe suit
            </button>
            <button
              type="button"
              className={`flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                g2Sel.options.suitVariant === 'pepe'
                  ? 'btn btn-primary'
                  : 'btn btn-ghost'
              }`}
              onClick={() => setG2Detail(activeLayer, undefined, { suitVariant: 'pepe' })}
            >
              Pepe suit
            </button>
          </div>
        </div>
      )}

      {/* Chia Farmer: one row — pick which part to color (also switches visible under layer) */}
      {hasSelection && hasG2Selection && g2Sel?.traitId === KNOWN_TRAIT_IDS.Clothes_ChiaFarmer && (
        <div className="generator-panel-section flex-shrink-0">
          <div className="generator-panel-section-label">Color</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`flex-1 whitespace-nowrap min-w-[calc(33%-4px)] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                (g2Sel.activeColorSlot ?? 'fill0') === 'fill0' ? 'btn btn-primary' : 'btn btn-ghost'
              }`}
              onClick={() => setChiaFarmerDetail('fill0', 'tee')}
            >
              Chia Farmer
            </button>
            <button
              type="button"
              className={`flex-1 whitespace-nowrap min-w-[calc(33%-4px)] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                g2Sel.activeColorSlot === 'fill1' && ((g2Sel.options.chiaFarmerUnderlayer as string | undefined) ?? 'tee') === 'tee'
                  ? 'btn btn-primary'
                  : 'btn btn-ghost'
              }`}
              onClick={() => setChiaFarmerDetail('fill1', 'tee')}
            >
              Tee
            </button>
            <button
              type="button"
              className={`flex-1 whitespace-nowrap min-w-[calc(33%-4px)] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                g2Sel.activeColorSlot === 'fill1' && g2Sel.options.chiaFarmerUnderlayer === 'tanktop'
                  ? 'btn btn-primary'
                  : 'btn btn-ghost'
              }`}
              onClick={() => setChiaFarmerDetail('fill1', 'tanktop')}
            >
              Tank Top
            </button>
          </div>
        </div>
      )}

      {/* G2 details: when Beer Hat + underlayer focus, show both can options and underlayer details; otherwise single panel */}
      <div className="flex flex-col gap-3">
        {activeLayer === 'Head' && g2Selections.Head?.traitId === KNOWN_TRAIT_IDS.Head_BeerHat && (
          <>
            {/* Can options — always visible when Beer Hat is selected */}
            <G2TraitPanel
              onDetailSelect={(file, frameFile) => {
                // Always update the Beer Hat's own detailOption (can flavor), regardless of beerHatEditFocus.
                // Pass beerHatEditFocus='beer' to force the reducer to route to the main selection.
                setG2Detail('Head', undefined, { detail: file ?? '', frame: frameFile ?? '', beerHatEditFocus: 'beer' });
              }}
            />
            {g2Selections.Head?.options.beerHatUnderlayerG2 && (
              /* Under layer details (Cap / Construction Helmet) — always visible */
              <G2TraitPanel
                overrideG2Selection={g2Selections.Head.options.beerHatUnderlayerG2 as G2Selection}
                onDetailSelect={(file, frameFile) => {
                  const underG2 = g2Selections.Head?.options.beerHatUnderlayerG2 as G2Selection | undefined;
                  if (!underG2) return;
                  // Atomic: set detail AND clear logoOption in one dispatch
                  const updated: G2Selection = { ...underG2, options: { ...underG2.options, detail: file ?? '', frame: frameFile ?? '', logo: file ? '' : underG2.options.logo } };
                  setG2Detail('Head', undefined, { beerHatUnderlayerG2: updated });
                }}
                onLogoSelect={(logoName) => {
                  const underG2 = g2Selections.Head?.options.beerHatUnderlayerG2 as G2Selection | undefined;
                  if (!underG2) return;
                  // Atomic: set logoOption AND clear detailOption in one dispatch
                  const updated: G2Selection = { ...underG2, options: { ...underG2.options, logo: logoName, detail: logoName ? '' : underG2.options.detail } };
                  setG2Detail('Head', undefined, { beerHatUnderlayerG2: updated });
                }}
                onVariantSelect={(variantFile) => {
                  const underG2 = g2Selections.Head?.options.beerHatUnderlayerG2 as G2Selection | undefined;
                  if (!underG2) return;
                  const updated: G2Selection = { ...underG2, options: { ...underG2.options, variant: variantFile } };
                  setG2Detail('Head', undefined, { beerHatUnderlayerG2: updated });
                }}
                onConstructionHelmetUpdate={(chiaLogo, cigPack) => {
                  const underG2 = g2Selections.Head?.options.beerHatUnderlayerG2 as G2Selection | undefined;
                  if (!underG2) return;
                  const updated: G2Selection = { ...underG2, options: { ...underG2.options, constructionHelmetChiaLogo: chiaLogo, constructionHelmetCigPack: cigPack } };
                  setG2Detail('Head', undefined, { beerHatUnderlayerG2: updated });
                }}
              />
            )}
          </>
        )}
        {!(activeLayer === 'Head' && g2Selections.Head?.traitId === KNOWN_TRAIT_IDS.Head_BeerHat) && (
          <G2TraitPanel />
        )}
      </div>
    </div>
  );
}

export default GeneratorRightPanel;
