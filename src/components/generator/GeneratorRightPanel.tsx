/**
 * Generator Right Panel (desktop)
 *
 * Renders in the right column: color picker always at top (same position for G1 and G2),
 * then G2 details (coin logos, etc.) below when applicable.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { useGenerator } from '@/contexts/GeneratorContext';
import { ColorPicker, COLOR_FAMILIES, QUICK_ACCESS_COLORS } from './ColorPicker';
import { G2TraitPanel } from './G2TraitPanel';
import { getUnifiedTraitById, getPathToTraitIdMap } from '@/services/generatorService';
import { isSelectionPathEmpty } from '@/types/generator';
import { isUserPickableFill, getAllUserPickableFillSlots } from '@/lib/g2FillTreatments';
import { getG2DefaultColor } from '@/config/g2DefaultColors';
import { BEER_HAT_COMPATIBLE_HEADS } from '@/lib/generatorTraitIds';
import type { UILayerName } from '@/lib/wojakRules';
import type { UnifiedTrait } from '@/services/generatorService';
import { G2TraitCard } from './TraitSelector';

/** Layers where G1 traits can be colored (Base, Mouth, etc. cannot) */
const LAYERS_WITH_G1_COLOR: UILayerName[] = ['Clothes', 'Head', 'Eyes'];

/** Background uses color picker only when "Solid color" is selected */
const isBackgroundSolidColor = (path: string | undefined) =>
  path === '__solid__' || path?.includes('__solid__');

/** Get the primary color slot key for a G2 trait (first user-pickable fill).
 * For layered traits (Viking helmet, 3D glasses) only considers slots that exist on the trait's layers,
 * so we don't pick fill0 when the trait only has fill1/fill2 (which would write to a slot the renderer never reads). */
function getPrimaryColorSlot(trait: UnifiedTrait | null): string | null {
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

function MilitaryBeretUpgradeSwatches({ onColorPick, disabled }: { onColorPick: (color: string) => void; disabled?: boolean }) {
  const Swatch = ({ hex }: { hex: string }) => (
    <button
      type="button"
      className="w-5 h-5 rounded flex-shrink-0 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: hex,
        border: '2px solid var(--color-border)',
        boxSizing: 'border-box',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onClick={() => !disabled && onColorPick(hex)}
      disabled={disabled}
      aria-label={`Use new design with color ${hex}`}
    />
  );
  return (
    <div className="flex flex-col gap-1.5">
      {/* Quick-access row — matches ColorPicker layout */}
      <div className="grid grid-cols-5 gap-1">
        {QUICK_ACCESS_COLORS.map((hex) => (
          <Swatch key={hex} hex={hex} />
        ))}
      </div>
      {COLOR_FAMILIES.map((family) => (
        <div key={family.label} className="grid grid-cols-6 gap-1">
          {family.colors.map((hex) => (
            <Swatch key={hex} hex={hex} />
          ))}
        </div>
      ))}
    </div>
  );
}

const MASK_VARIANTS = [
  { file: 'MedievalBepe_cowboy.png', label: 'Cowboy Bepe' },
  { file: 'MedievalBepe_emo.png', label: 'Emo Bepe' },
  { file: 'MedievalBepe_wizard.png', label: 'Wizard Bepe' },
  { file: 'Skull_mask_love.png', label: 'Skull Love' },
  { file: 'Skull_mask_orange.png', label: 'Skull Orange' },
  { file: 'Skull_mask_pink.png', label: 'Skull Pink' },
  { file: 'Skull_mask_zebra.png', label: 'Skull Zebra' },
  { file: 'Tanginium_king.png', label: 'Tanginium King' },
  { file: 'Tanginium_sad.png', label: 'Tanginium Sad' },
];
const MASK_BASE_PATH = '/assets/wojak-layers/MASK';

/** All full-face mask path substrings (hand mask + all style variants) */
const FULL_FACE_MASK_SUBSTRINGS = [
  'Wojak_hand_mask',
  ...MASK_VARIANTS.map((v) => v.file.replace('.png', '')),
];

function isFullFaceMaskSelected(maskPath: string | undefined): boolean {
  if (!maskPath) return false;
  return FULL_FACE_MASK_SUBSTRINGS.some((s) => maskPath.includes(s));
}

function MaskVariantPicker({ selectedPath, onSelect }: { selectedPath: string | undefined; onSelect: (path: string) => void }) {
  return (
    <div className="flex-shrink-0">
      <div className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Mask style</div>
      <div className="grid grid-cols-3 gap-2">
        {MASK_VARIANTS.map(({ file, label }) => {
          const path = `${MASK_BASE_PATH}/${file}`;
          const isSelected = selectedPath === path;
          return (
            <button
              key={file}
              type="button"
              className="aspect-square relative rounded-xl overflow-hidden"
              style={{
                background: 'var(--generator-trait-card-bg)',
                border: isSelected
                  ? '2px solid var(--generator-selected-color, #F97316)'
                  : '1px solid var(--generator-trait-card-border)',
                boxShadow: isSelected
                  ? '0 0 20px rgba(0, 212, 255, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)'
                  : '0 2px 8px rgba(0, 0, 0, 0.2)',
              }}
              onClick={() => onSelect(path)}
              title={label}
            >
              <img
                src={path}
                alt={label}
                className="w-full h-full object-contain"
                loading="lazy"
              />
              {isSelected && (
                <div
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--generator-badge-color, #F97316)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                    <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BeerHatUnderlayerPicker({ selectedTraitId, onSelect }: { selectedTraitId: string; onSelect: (traitId: string) => void }) {
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
            <div key={traitId} className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
              <G2TraitCard
                trait={trait}
                isSelected={isSelected}
                onClick={() => onSelect(traitId)}
                needsClothesUnderlay
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GeneratorRightPanel() {
  const { activeLayer, selectedLayers, g2Selections, selectedColors, setColor, setG2Color, setG2Detail, selectLayer, selectG2Layer, isInitialized } = useGenerator();
  const setChiaFarmerDetail = (activeColorSlot?: 'fill0' | 'fill1', chiaFarmerUnderlayer?: 'tee' | 'tanktop') => {
    setG2Detail(activeLayer, undefined, undefined, undefined, undefined, undefined, undefined, activeColorSlot, undefined, chiaFarmerUnderlayer);
  };
  const [g2Trait, setG2Trait] = useState<UnifiedTrait | null>(null);
  const [militaryBeretTrait, setMilitaryBeretTrait] = useState<UnifiedTrait | null>(null);

  const hasSelection = !!(selectedLayers[activeLayer] || g2Selections[activeLayer]);
  const hasG2Selection = !!g2Selections[activeLayer];
  let g2Sel = g2Selections[activeLayer];
  const isBeerHatWithUnderlayerFocus =
    activeLayer === 'Head' &&
    g2Sel?.traitId === 'Head_Beer-Hat' &&
    g2Sel.beerHatEditFocus === 'underlayer' &&
    g2Sel.beerHatUnderlayerG2;
  if (isBeerHatWithUnderlayerFocus && g2Sel) {
    g2Sel = g2Sel.beerHatUnderlayerG2!;
  }

  const isG1MilitaryBeret =
    activeLayer === 'Head' &&
    selectedLayers.Head?.includes('Military-Beret') &&
    !g2Selections.Head;

  useEffect(() => {
    if (!g2Sel?.traitId) {
      setG2Trait(null);
      return;
    }
    getUnifiedTraitById(g2Sel.traitId).then(setG2Trait).catch(() => setG2Trait(null));
  }, [g2Sel?.traitId]);

  useEffect(() => {
    if (isG1MilitaryBeret) {
      getUnifiedTraitById('Head_military-beret').then(setMilitaryBeretTrait).catch(() => setMilitaryBeretTrait(null));
    } else {
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
    (g2Sel?.traitId === 'Head_viking-helmet' || g2Sel?.traitId === 'Face-wear_3d-glases') && rawColorSlots.length === 0
      ? ['fill1']
      : rawColorSlots;

  // Color picker always in same position; controls G1 layer color or G2 trait color.
  // For multi-fill traits: activeColorSlot selects which fill the picker edits; else first slot.
  const primarySlot = hasG2Selection
    ? (g2Sel?.traitId === 'Clothes_Suit'
        ? (g2Sel.activeColorSlot ?? 'fill0')
        : g2Sel?.traitId === 'Clothes_Chia-farmer'
          ? (g2Sel.activeColorSlot ?? 'fill0')
          : allColorSlots.length > 1
            ? (g2Sel?.activeColorSlot && allColorSlots.includes(g2Sel.activeColorSlot)
                ? g2Sel.activeColorSlot
                : allColorSlots[0])
            : (getPrimaryColorSlot(g2Trait) ?? (g2Sel?.traitId === 'Clothes_Astronaut' ? 'fill' : g2Sel?.traitId === 'Clothes_Ninja-turtle-fit' ? 'fill0' : g2Sel?.traitId === 'Head_viking-helmet' ? 'fill1' : g2Sel?.traitId === 'Face-wear_3d-glases' ? 'fill1' : null)))
    : null;
  const isG2Colorable = hasG2Selection && (!!g2Trait?.colorable || g2Sel?.traitId === 'Clothes_Astronaut' || g2Sel?.traitId === 'Clothes_Chia-farmer' || g2Sel?.traitId === 'Head_viking-helmet' || g2Sel?.traitId === 'Face-wear_3d-glases') && primarySlot !== null;
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
    g2Sel?.traitId === 'Clothes_Suit' && g2Trait?.defaultColors
      ? (primarySlot === 'fill0' ? g2Trait.defaultColors[0] : g2Trait.defaultColors[1])
      : g2Sel?.traitId === 'Head_viking-helmet'
        ? (g2Trait?.defaultColors?.[0] ?? g2Sel?.colors?.fill1 ?? '#FF6B00')
        : g2Sel?.traitId === 'Clothes_Chia-farmer'
          ? getG2DefaultColor(g2Sel.traitId, primarySlot === 'fill0' ? 'fill0' : 'fill1', g2Trait ?? null, '#FFFFFF')
          : primarySlot && allColorSlots.length > 0
            ? defaultColorForSlot(primarySlot, slotIndex >= 0 ? slotIndex : 0)
            : (g2Trait?.defaultColor || (g2Sel?.traitId === 'Clothes_Astronaut' ? '#FFFFFF' : undefined));

  const isMilitaryBeretG2 = g2Sel?.traitId === 'Head_military-beret';

  const colorPickerProps = hasG2Selection
    ? {
        selectedColor: g2Sel?.colors?.[primarySlot ?? 'fill1'] || '#FFFFFF',
        onColorChange: (color: string) => primarySlot && setG2Color(activeLayer, primarySlot, color),
        disabled: !isG2Colorable,
        defaultColor: isG2Colorable ? defaultColor : undefined,
        onReset: isMilitaryBeretG2 && g2Trait?.g1Path
          ? () => selectLayer('Head', g2Trait.g1Path!)
          : g2Sel?.traitId === 'Head_Cap'
            ? () => {
                if (primarySlot) setG2Color(activeLayer, primarySlot, defaultColor ?? '#228B22');
                setG2Detail(activeLayer, '');
              }
            : undefined,
      }
    : {
        selectedColor:
          activeLayer === 'Background' && isBackgroundSolidColor(selectedLayers.Background)
            ? (selectedColors?.[activeLayer] || '#1a1a2e')
            : (selectedColors?.[activeLayer] || '#FFFFFF'),
        onColorChange: (color: string) => setColor(activeLayer, color),
        disabled: !isG1Colorable,
        defaultColor:
          activeLayer === 'Background' && isBackgroundSolidColor(selectedLayers.Background)
            ? '#1a1a2e'
            : undefined,
      };

  const hexDisplayRef = useRef('');
  const [hexDisplay, setHexDisplay] = useState('');
  const handleHexDisplay = useCallback((hex: string) => {
    if (hex !== hexDisplayRef.current) {
      hexDisplayRef.current = hex;
      setHexDisplay(hex);
    }
  }, []);

  return (
    <div
      className="flex flex-col gap-3"
      style={{
        padding: '12px',
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(255, 255, 255, 0.015)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* G1 Military Beret: "Pick a color to use new design" — swatches switch to G2 */}
      {isG1MilitaryBeret && (
        <div className="generator-panel-section flex-shrink-0">
          <div className="generator-panel-section-label">Pick a color to use new design</div>
          <MilitaryBeretUpgradeSwatches
            onColorPick={(color) => militaryBeretTrait && selectG2Layer(activeLayer, militaryBeretTrait, { fill: color })}
            disabled={!militaryBeretTrait}
          />
        </div>
      )}
      {/* Single color palette — always visible (disabled when not colorable) */}
      {!isG1MilitaryBeret && (
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5" style={{ height: '14px' }}>
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Color</span>
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
              <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{hexDisplay}</span>
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
        g2Sel?.traitId !== 'Clothes_Suit' &&
        g2Sel?.traitId !== 'Clothes_Chia-farmer' && (
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
                      const clearLogo = g2Sel?.traitId === 'Head_Comrad-Hat' && slot === 'fill3' ? '' : undefined;
                      setG2Detail(activeLayer, undefined, undefined, clearLogo, undefined, undefined, undefined, slot);
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
      {activeLayer === 'Head' && g2Selections.Head?.traitId === 'Head_Beer-Hat' && (
        <BeerHatUnderlayerPicker
          selectedTraitId={g2Selections.Head?.beerHatUnderlayer ?? 'Head_Cap'}
          onSelect={(traitId) => {
            const defaultColors: Record<string, string> =
              traitId === 'Head_viking-helmet'
                ? { fill1: getG2DefaultColor(traitId, 'fill1', null, '#404040') }
                : traitId === 'Head_Cap'
                  ? { fill: getG2DefaultColor(traitId, 'fill', null, '#228B22') }
                  : {};
            setG2Detail(
              activeLayer,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              traitId,
              { traitId, g2Category: 'Head', colors: defaultColors },
              'underlayer'
            );
          }}
        />
      )}

      {/* Bepe suit: toggle Bepe / Pepe variant (under color picker) */}
      {hasSelection && hasG2Selection && g2Sel?.traitId === 'Clothes_Bepe-suit' && (
        <div className="generator-panel-section flex-shrink-0">
          <div className="generator-panel-section-label">Suit style</div>
          <div className="flex gap-2">
            <button
              type="button"
              className={`flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                (g2Sel.suitVariant ?? 'bepe') === 'bepe'
                  ? 'btn btn-primary'
                  : 'btn btn-ghost'
              }`}
              onClick={() => setG2Detail(activeLayer, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'bepe')}
            >
              Bepe suit
            </button>
            <button
              type="button"
              className={`flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                g2Sel.suitVariant === 'pepe'
                  ? 'btn btn-primary'
                  : 'btn btn-ghost'
              }`}
              onClick={() => setG2Detail(activeLayer, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'pepe')}
            >
              Pepe suit
            </button>
          </div>
        </div>
      )}

      {/* Chia Farmer: one row — pick which part to color (also switches visible under layer) */}
      {hasSelection && hasG2Selection && g2Sel?.traitId === 'Clothes_Chia-farmer' && (
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
                g2Sel.activeColorSlot === 'fill1' && (g2Sel.chiaFarmerUnderlayer ?? 'tee') === 'tee'
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
                g2Sel.activeColorSlot === 'fill1' && g2Sel.chiaFarmerUnderlayer === 'tanktop'
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
        {activeLayer === 'Head' && g2Selections.Head?.traitId === 'Head_Beer-Hat' && (
          <>
            {/* Can options — always visible when Beer Hat is selected */}
            <G2TraitPanel
              onDetailSelect={(file, frameFile) => {
                // Always update the Beer Hat's own detailOption (can flavor), regardless of beerHatEditFocus.
                // Pass beerHatEditFocus='beer' to force the reducer to route to the main selection.
                setG2Detail('Head', file ?? '', frameFile ?? '', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'beer');
              }}
            />
            {g2Selections.Head?.beerHatUnderlayerG2 && (
              /* Under layer details (Cap / Construction Helmet) — always visible */
              <G2TraitPanel
                overrideG2Selection={g2Selections.Head.beerHatUnderlayerG2}
                onDetailSelect={(file, frameFile) => {
                  const underG2 = g2Selections.Head?.beerHatUnderlayerG2;
                  if (!underG2) return;
                  // Atomic: set detail AND clear logoOption in one dispatch
                  const updated = { ...underG2, detailOption: file ?? '', frameOption: frameFile ?? '', logoOption: file ? '' : underG2.logoOption };
                  setG2Detail('Head', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, updated);
                }}
                onLogoSelect={(logoName) => {
                  const underG2 = g2Selections.Head?.beerHatUnderlayerG2;
                  if (!underG2) return;
                  // Atomic: set logoOption AND clear detailOption in one dispatch
                  const updated = { ...underG2, logoOption: logoName, detailOption: logoName ? '' : underG2.detailOption };
                  setG2Detail('Head', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, updated);
                }}
                onVariantSelect={(variantFile) => {
                  const underG2 = g2Selections.Head?.beerHatUnderlayerG2;
                  if (!underG2) return;
                  const updated = { ...underG2, variant: variantFile };
                  setG2Detail('Head', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, updated);
                }}
                onConstructionHelmetUpdate={(chiaLogo, cigPack) => {
                  const underG2 = g2Selections.Head?.beerHatUnderlayerG2;
                  if (!underG2) return;
                  const updated = { ...underG2, constructionHelmetChiaLogo: chiaLogo, constructionHelmetCigPack: cigPack };
                  setG2Detail('Head', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, updated);
                }}
              />
            )}
          </>
        )}
        {!(activeLayer === 'Head' && g2Selections.Head?.traitId === 'Head_Beer-Hat') && (
          <G2TraitPanel />
        )}
      </div>
    </div>
  );
}

export default GeneratorRightPanel;
